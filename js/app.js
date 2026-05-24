document.addEventListener('DOMContentLoaded', () => {

    /* ── État ───────────────────────────────────────── */
    let currentCountry = 'FR';
    let steps          = [];   
    let selectedStepId = null; // mode "ajout à une marche existante"
    
    // Contiendra les images importées localement par l'utilisateur
    const customLogos = {};
    for (const key of Object.keys(ASSETS_DATA)) {
        customLogos[key] = [];
    }

    /* ── Éléments fixes ─────────────────────────────── */
    const countriesContainer = document.getElementById('countries-container');
    const logosContainer     = document.getElementById('logos-container');
    const staircaseContainer = document.getElementById('staircase-container');
    const emptyHint          = document.getElementById('empty-hint');
    const importFileInput    = document.getElementById('import-file');
    const downloadBtn        = document.getElementById('download-btn');

    /* ── Init ───────────────────────────────────────── */
    renderCountries();
    renderLogos();
    renderStaircase();

    /* ══════════════════════════════════════════════════
       EXPORTATION EN IMAGE (PNG COMPLET)
    ══════════════════════════════════════════════════ */
    downloadBtn.addEventListener('click', () => {
        if (!steps.length) {
            alert("Ajoutez au moins un logo pour pouvoir exporter votre parcours !");
            return;
        }

        // 1. On active une classe globale pour masquer temporairement les éléments d'édition/scroll
        document.body.classList.add('is-capturing');

        const target = document.getElementById('canvas-paper');

        // 2. On configure html2canvas pour cibler la largeur totale de l'escalier (même cachée)
        html2canvas(target, {
            useCORS: true,
            allowTaint: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            width: target.scrollWidth,  // Capture la largeur réelle complète
            height: target.scrollHeight, // Capture la hauteur réelle complète
            windowWidth: target.scrollWidth,
            windowHeight: target.scrollHeight,
            backgroundColor: '#FAFAF8'  // Force le fond papier blanc
        }).then(canvas => {
            // 3. Capture terminée, on retire la classe pour restaurer l'interface active
            document.body.classList.remove('is-capturing');

            // 4. Téléchargement automatique de l'image
            const link = document.createElement('a');
            link.download = `mon-parcours-politique-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            document.body.classList.remove('is-capturing');
            console.error("Erreur exportation:", err);
            alert("Une erreur est survenue lors de la génération de l'image.");
        });
    });

    /* ══════════════════════════════════════════════════
       IMPORTATION DE FICHIERS LOCAUX
    ══════════════════════════════════════════════════ */
    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (!customLogos[currentCountry]) {
                customLogos[currentCountry] = [];
            }
            customLogos[currentCountry].push({
                src: event.target.result,
                name: file.name
            });
            renderLogos();
            importFileInput.value = '';
        };
        reader.readAsDataURL(file);
    });

    /* ══════════════════════════════════════════════════
       PAYS
    ══════════════════════════════════════════════════ */
    function renderCountries() {
        countriesContainer.innerHTML = '';
        for (const [code, data] of Object.entries(ASSETS_DATA)) {
            const btn = document.createElement('button');
            btn.className = 'country-btn' + (code === currentCountry ? ' active' : '');
            btn.title = code;
            btn.innerHTML = `<span class="fi fi-${data.flag}"></span>`;
            btn.addEventListener('click', () => {
                currentCountry = code;
                selectedStepId = null;
                logosContainer.classList.remove('adding-mode');
                renderCountries();
                renderLogos();
            });
            countriesContainer.appendChild(btn);
        }
    }

    /* ══════════════════════════════════════════════════
       LOGOS SIDEBAR
    ══════════════════════════════════════════════════ */
    function renderLogos() {
        logosContainer.innerHTML = '';

        /* Bouton "?" */
        appendLogoItem(null, '?', true);

        /* Logos statiques du dossier assets/ */
        ASSETS_DATA[currentCountry].files.forEach(filename => {
            appendLogoItem(`assets/${currentCountry}/${filename}`, filename, false);
        });

        /* Logos importés localement par l'utilisateur */
        if (customLogos[currentCountry]) {
            customLogos[currentCountry].forEach(logo => {
                appendLogoItem(logo.src, logo.name, false);
            });
        }
    }

    function appendLogoItem(imgPath, label, isUnknown) {
        const div = document.createElement('div');
        div.className = 'logo-item';

        if (isUnknown) {
            div.innerHTML = `<span class="unknown-icon">?</span>`;
        } else {
            const img = document.createElement('img');
            img.src = imgPath;
            img.alt = label;
            img.onerror = function () {
                div.innerHTML = `<div class="logo-missing">
                    <span class="miss-icon">?</span>
                    <span>${label}</span>
                </div>`;
            };
            div.appendChild(img);
        }

        div.addEventListener('click', () => onLogoClick(imgPath));
        logosContainer.appendChild(div);
    }

    /* ── Clic Logo ── */
    function onLogoClick(imgPath) {
        if (selectedStepId !== null) {
            const step = steps.find(s => s.id === selectedStepId);
            if (step) {
                step.imgs.push(imgPath);
                selectedStepId = null;
                logosContainer.classList.remove('adding-mode');
                renderStaircase();
                return;
            }
        }
        
        const defaultDate = (typeof translations !== 'undefined' && translations['fr']) 
            ? translations['fr']['default-date'] 
            : "Date de début\nDate de fin";

        steps.push({
            id:    Date.now(),
            imgs:  [imgPath],
            dates: defaultDate
        });
        renderStaircase();
    }

    /* ── Sélection d'une marche (ajout logo) ── */
    function toggleSelectStep(id) {
        if (selectedStepId === id) {
            selectedStepId = null;
            logosContainer.classList.remove('adding-mode');
        } else {
            selectedStepId = id;
            logosContainer.classList.add('adding-mode');
        }
        renderStaircase();
    }

    /* ══════════════════════════════════════════════════
       ESCALIER (DOM Flexbox)
    ══════════════════════════════════════════════════ */
    function renderStaircase() {
        document.querySelectorAll('.date-input').forEach((el, i) => {
            if (steps[i]) steps[i].dates = el.innerText;
        });

        staircaseContainer.innerHTML = '';
        emptyHint.style.display = steps.length ? 'none' : 'block';

        if (!steps.length) return;

        const BASE_HEIGHT = 40; 
        const INC_HEIGHT  = 35; 

        steps.forEach((step, i) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'step';
            stepEl.style.height = `${BASE_HEIGHT + (i * INC_HEIGHT)}px`;
            
            if (step.id === selectedStepId) stepEl.classList.add('selected');

            const contentEl = document.createElement('div');
            contentEl.className = 'step-content';

            /* Logos sur la marche */
            const logosDiv = document.createElement('div');
            logosDiv.className = 'step-logos';
            step.imgs.forEach((src, li) => {
                const el = src
                    ? Object.assign(document.createElement('img'), { src, className: 'step-logo', title: 'Cliquer pour retirer' })
                    : Object.assign(document.createElement('div'), { className: 'step-unknown', textContent: '?' });
                el.addEventListener('click', e => {
                    e.stopPropagation();
                    step.imgs.splice(li, 1);
                    if (!step.imgs.length) steps = steps.filter(s => s.id !== step.id);
                    renderStaircase();
                });
                logosDiv.appendChild(el);
            });
            contentEl.appendChild(logosDiv);

            /* Date */
            const dateEl = document.createElement('div');
            dateEl.className = 'date-input';
            dateEl.contentEditable = 'true';
            dateEl.spellcheck = false;
            dateEl.innerHTML = escHtml(step.dates);
            dateEl.addEventListener('blur',    () => { step.dates = dateEl.innerText; });
            dateEl.addEventListener('keydown', e => {
                if (e.key === 'Enter')  { e.preventDefault(); document.execCommand('insertLineBreak'); }
                if (e.key === 'Escape') dateEl.blur();
            });
            contentEl.appendChild(dateEl);

            /* Boutons */
            const actions = document.createElement('div');
            actions.className = 'step-actions';

            const addBtn = document.createElement('button');
            addBtn.className = 'add-btn';
            addBtn.textContent = '+ Logo';
            addBtn.addEventListener('click', e => { e.stopPropagation(); toggleSelectStep(step.id); });

            const delBtn = document.createElement('button');
            delBtn.className = 'del-btn';
            delBtn.textContent = 'Retirer';
            delBtn.addEventListener('click', e => {
                e.stopPropagation();
                steps = steps.filter(s => s.id !== step.id);
                if (selectedStepId === step.id) {
                    selectedStepId = null;
                    logosContainer.classList.remove('adding-mode');
                }
                renderStaircase();
            });

            actions.appendChild(addBtn);
            actions.appendChild(delBtn);
            contentEl.appendChild(actions);

            stepEl.appendChild(contentEl);
            staircaseContainer.appendChild(stepEl);
        });
    }

    function escHtml(s) {
        return s
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/\n/g,'<br>');
    }
});
