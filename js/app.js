document.addEventListener('DOMContentLoaded', () => {

    /* ══════════════════════════════════════
       ÉTAT
    ══════════════════════════════════════ */
    let currentCountry = 'FR';
    let steps          = [];
    let history        = [];   // pour undo
    let selectedStepId = null;
    const customLogos  = {};
    for (const key of Object.keys(ASSETS_DATA)) customLogos[key] = [];

    /* ══════════════════════════════════════
       ÉLÉMENTS DOM
    ══════════════════════════════════════ */
    const countriesContainer = document.getElementById('countries-container');
    const logosContainer     = document.getElementById('logos-container');
    const staircaseContainer = document.getElementById('staircase-container');
    const emptyHint          = document.getElementById('empty-hint');
    const importFileInput    = document.getElementById('import-file');
    const downloadBtn        = document.getElementById('download-btn');
    const undoBtn            = document.getElementById('undo-btn');
    const clearBtn           = document.getElementById('clear-btn');
    const mobileToggle       = document.getElementById('mobile-toggle');
    const sidebar            = document.getElementById('sidebar');
    const overlay            = document.getElementById('mobile-overlay');
    const addingHint         = document.getElementById('adding-hint');
    const logosLabel         = document.getElementById('logos-label');
    const journeyTitle       = document.getElementById('journey-title');

    /* ══════════════════════════════════════
       INIT
    ══════════════════════════════════════ */
    renderCountries();
    renderLogos();
    renderStaircase();

    /* ══════════════════════════════════════
       MOBILE PANEL
    ══════════════════════════════════════ */
    mobileToggle.addEventListener('click', openMobilePanel);
    overlay.addEventListener('click', closeMobilePanel);

    function openMobilePanel() {
        sidebar.classList.add('mobile-open');
        overlay.classList.remove('hidden');
    }
    function closeMobilePanel() {
        sidebar.classList.remove('mobile-open');
        overlay.classList.add('hidden');
        selectedStepId = null;
        addingHint.classList.add('hidden');
        logosLabel.style.display = '';
        renderStaircase();
    }

    /* ══════════════════════════════════════
       UNDO / CLEAR
    ══════════════════════════════════════ */
    function pushHistory() {
        history.push(JSON.stringify(steps));
        if (history.length > 30) history.shift();
    }

    undoBtn.addEventListener('click', () => {
        if (!history.length) return;
        steps = JSON.parse(history.pop());
        renderStaircase();
    });

    clearBtn.addEventListener('click', () => {
        if (!steps.length) return;
        if (!confirm('Effacer tout le parcours ?')) return;
        pushHistory();
        steps = [];
        selectedStepId = null;
        renderStaircase();
    });

    /* ══════════════════════════════════════
       EXPORT CANVAS 2D (PNG haute qualité)
    ══════════════════════════════════════ */
    downloadBtn.addEventListener('click', exportImage);

    async function exportImage() {
        if (!steps.length) {
            alert('Ajoutez au moins un logo pour exporter votre parcours !');
            return;
        }

        downloadBtn.disabled = true;
        downloadBtn.querySelector('span').textContent = 'Génération…';

        try {
            const pngUrl = await buildExportCanvas();
            const a = document.createElement('a');
            a.download = `parcours-politique-${Date.now()}.png`;
            a.href = pngUrl;
            a.click();
        } catch (e) {
            console.error(e);
            alert('Erreur lors de l\'exportation.');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.querySelector('span').textContent = 'Exporter';
        }
    }

    async function buildExportCanvas() {
        const STEP_W  = 150;
        const BASE_H  = 50;
        const INC_H   = 40;
        const PAD_L   = 80;
        const PAD_R   = 80;
        const PAD_T   = 200;   // espace logos au-dessus
        const PAD_B   = 70;
        const LOGO_SZ = 76;    // taille max d'un logo (CSS strict)
        const nSteps  = steps.length;
        const maxH    = BASE_H + (nSteps - 1) * INC_H;
        const W       = PAD_L + nSteps * STEP_W + PAD_R;
        const H       = PAD_T + maxH + PAD_B;
        const title   = journeyTitle.value.trim() || 'Mon Parcours Politique';

        // ── Construire le div d'export dans le DOM (hors écran) ──
        const wrap = document.createElement('div');
        wrap.style.cssText = [
            'position:fixed',
            'top:0', 'left:0',
            'z-index:-9999',
            'pointer-events:none',
            `width:${W}px`,
            `height:${H}px`,
            'background:#FAFAF8',
            'overflow:hidden',
            'font-family:Barlow Condensed,sans-serif'
        ].join(';');

        // Titre
        const titleEl = document.createElement('div');
        titleEl.textContent = title.toUpperCase();
        titleEl.style.cssText = `position:absolute;top:24px;left:${PAD_L}px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:26px;letter-spacing:2px;color:#0C0C0C;line-height:1`;
        wrap.appendChild(titleEl);

        // Trait rouge sous titre
        const bar = document.createElement('div');
        bar.style.cssText = `position:absolute;top:56px;left:${PAD_L}px;width:56px;height:3px;background:#D01020`;
        wrap.appendChild(bar);

        // Ligne plancher
        const floorY = PAD_T + maxH;
        const floor  = document.createElement('div');
        floor.style.cssText = `position:absolute;left:${PAD_L}px;top:${floorY}px;width:${nSteps * STEP_W}px;height:3px;background:#0C0C0C`;
        wrap.appendChild(floor);

        // Flèche
        const arrow = document.createElement('div');
        arrow.style.cssText = `position:absolute;top:${floorY - 7}px;left:${PAD_L + nSteps * STEP_W + 2}px;width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;border-left:14px solid #0C0C0C`;
        wrap.appendChild(arrow);

        // Marches
        steps.forEach((step, i) => {
            const stepH = BASE_H + i * INC_H;
            const stepX = PAD_L + i * STEP_W;
            const stepY = floorY - stepH;

            // Contour de la marche
            const box = document.createElement('div');
            box.style.cssText = `position:absolute;left:${stepX}px;top:${stepY}px;width:${STEP_W}px;height:${stepH}px;border:3px solid #0C0C0C;box-sizing:border-box;background:transparent`;
            // Fermer côté droit seulement sur la dernière
            if (i < nSteps - 1) box.style.borderRight = 'none';
            wrap.appendChild(box);

            // Numéro
            const num = document.createElement('div');
            num.textContent = String(i + 1);
            num.style.cssText = `position:absolute;left:${stepX}px;top:${floorY - 20}px;width:${STEP_W}px;text-align:center;font-family:'Syne',sans-serif;font-size:11px;font-weight:600;color:#aaaaaa`;
            wrap.appendChild(num);

            // Logos
            const n    = step.imgs.length;
            const cols = n <= 2 ? n : Math.min(n, 3);
            const gap  = 4;
            const lsz  = Math.round(Math.min(LOGO_SZ, (STEP_W - 16) / cols));
            const totalW = cols * lsz + (cols - 1) * gap;
            const rows   = Math.ceil(n / cols);
            const totalH = rows * lsz + (rows - 1) * gap;
            const startX = stepX + Math.round((STEP_W - totalW) / 2);
            const startY = stepY - totalH - 14;

            step.imgs.forEach((src, li) => {
                const col = li % cols;
                const row = Math.floor(li / cols);
                const lx  = startX + col * (lsz + gap);
                const ly  = startY + row * (lsz + gap);

                const slot = document.createElement('div');
                slot.style.cssText = `position:absolute;left:${lx}px;top:${ly}px;width:${lsz}px;height:${lsz}px;overflow:hidden;background:#FAFAF8;display:flex;align-items:center;justify-content:center`;

                if (src) {
                    const img = document.createElement('img');
                    img.src = src;
                    // CSS strict — aucun débordement possible
                    img.style.cssText = `display:block;width:${lsz}px;height:${lsz}px;max-width:${lsz}px;max-height:${lsz}px;object-fit:contain;flex-shrink:0`;
                    img.crossOrigin = 'anonymous';
                    slot.appendChild(img);
                } else {
                    slot.style.border = '1.5px solid #cccccc';
                    slot.style.background = '#eeeeee';
                    const q = document.createElement('span');
                    q.textContent = '?';
                    q.style.cssText = 'font-family:Barlow Condensed,sans-serif;font-weight:700;font-size:28px;color:#aaaaaa';
                    slot.appendChild(q);
                }
                wrap.appendChild(slot);
            });

            // Date
            if (step.dates && step.dates.trim()) {
                const lines = step.dates.split('\n');
                lines.forEach((line, li) => {
                    const dt = document.createElement('div');
                    dt.textContent = line;
                    dt.style.cssText = `position:absolute;left:${stepX}px;top:${stepY + 10 + li * 14}px;width:${STEP_W}px;text-align:center;font-family:'Syne',sans-serif;font-size:10px;font-weight:600;color:#444444;letter-spacing:.01em`;
                    wrap.appendChild(dt);
                });
            }
        });

        // Watermark
        const wm = document.createElement('div');
        wm.textContent = 'WASLL POLITICAL JOURNEY';
        wm.style.cssText = `position:absolute;bottom:14px;right:18px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:600;letter-spacing:.14em;color:#cccccc`;
        wrap.appendChild(wm);

        document.body.appendChild(wrap);

        // Attendre que toutes les images soient chargées
        const imgs = Array.from(wrap.querySelectorAll('img'));
        await Promise.all(imgs.map(img =>
            img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
        ));
        // Petit délai de rendu
        await new Promise(r => setTimeout(r, 120));

        // Capturer avec html2canvas
        const canvas = await html2canvas(wrap, {
            useCORS: true,
            allowTaint: false,
            logging: false,
            scale: 2,
            width: W,
            height: H,
            windowWidth: W,
            windowHeight: H,
            backgroundColor: '#FAFAF8'
        });

        document.body.removeChild(wrap);
        return canvas.toDataURL('image/png');
    }

    /* ══════════════════════════════════════
       IMPORT FICHIER LOCAL
    ══════════════════════════════════════ */
    importFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            if (!customLogos[currentCountry]) customLogos[currentCountry] = [];
            customLogos[currentCountry].push({ src: ev.target.result, name: file.name });
            renderLogos();
            importFileInput.value = '';
        };
        reader.readAsDataURL(file);
    });

    /* ══════════════════════════════════════
       PAYS
    ══════════════════════════════════════ */
    function renderCountries() {
        countriesContainer.innerHTML = '';
        for (const [code, data] of Object.entries(ASSETS_DATA)) {
            const btn = document.createElement('button');
            btn.className = 'country-btn' + (code === currentCountry ? ' active' : '');
            btn.title = code;
            btn.innerHTML = `<span class="fi fi-${data.flag}"></span>`;
            btn.addEventListener('click', () => {
                currentCountry = code;
                exitSelectMode();
                renderCountries();
                renderLogos();
            });
            countriesContainer.appendChild(btn);
        }
    }

    /* ══════════════════════════════════════
       LOGOS SIDEBAR
    ══════════════════════════════════════ */
    function renderLogos() {
        logosContainer.innerHTML = '';
        appendLogoItem(null, '?', true);
        ASSETS_DATA[currentCountry].files.forEach(f => {
            appendLogoItem(`assets/${currentCountry}/${f}`, f, false);
        });
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
                div.innerHTML = `<div class="logo-missing"><span class="miss-icon">?</span><span>${label.replace(/\.[^.]+$/, '')}</span></div>`;
            };
            div.appendChild(img);
        }
        div.addEventListener('click', () => {
            onLogoClick(imgPath);
            // Fermer le panel mobile après sélection
            if (window.innerWidth <= 720) closeMobilePanel();
        });
        logosContainer.appendChild(div);
    }

    /* ══════════════════════════════════════
       CLICK LOGO → ajouter à l'escalier
    ══════════════════════════════════════ */
    function onLogoClick(imgPath) {
        pushHistory();
        if (selectedStepId !== null) {
            const step = steps.find(s => s.id === selectedStepId);
            if (step) {
                step.imgs.push(imgPath);
                exitSelectMode();
                renderStaircase();
                return;
            }
        }
        steps.push({ id: Date.now(), imgs: [imgPath], dates: '' });
        renderStaircase();
    }

    function exitSelectMode() {
        selectedStepId = null;
        addingHint.classList.add('hidden');
        logosLabel.style.display = '';
    }

    function toggleSelectStep(id) {
        if (selectedStepId === id) {
            exitSelectMode();
        } else {
            selectedStepId = id;
            addingHint.classList.remove('hidden');
            logosLabel.style.display = 'none';
            // Ouvrir sidebar mobile si besoin
            if (window.innerWidth <= 720) openMobilePanel();
        }
        renderStaircase();
    }

    /* ══════════════════════════════════════
       DÉPLACER UNE MARCHE
    ══════════════════════════════════════ */
    function moveStep(id, dir) {
        const idx = steps.findIndex(s => s.id === id);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= steps.length) return;
        pushHistory();
        const tmp = steps[idx];
        steps[idx] = steps[newIdx];
        steps[newIdx] = tmp;
        renderStaircase();
    }

    /* ══════════════════════════════════════
       RENDU ESCALIER
    ══════════════════════════════════════ */
    function renderStaircase() {
        // Sauvegarde les dates en cours d'édition
        document.querySelectorAll('.date-input').forEach((el, i) => {
            if (steps[i]) steps[i].dates = el.innerText;
        });

        staircaseContainer.innerHTML = '';
        emptyHint.style.display = steps.length ? 'none' : 'flex';
        if (!steps.length) return;

        const BASE_H = 48;
        const INC_H  = 38;

        steps.forEach((step, i) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'step' + (step.id === selectedStepId ? ' selected' : '');
            stepEl.style.height = `${BASE_H + i * INC_H}px`;

            const contentEl = document.createElement('div');
            contentEl.className = 'step-content';

            // Logos
            const logosDiv = document.createElement('div');
            logosDiv.className = 'step-logos';
            step.imgs.forEach((src, li) => {
                const el = src
                    ? Object.assign(document.createElement('img'), { src, className: 'step-logo', title: 'Cliquer pour retirer' })
                    : Object.assign(document.createElement('div'), { className: 'step-unknown', textContent: '?' });
                el.addEventListener('click', e => {
                    e.stopPropagation();
                    pushHistory();
                    step.imgs.splice(li, 1);
                    if (!step.imgs.length) steps = steps.filter(s => s.id !== step.id);
                    renderStaircase();
                });
                logosDiv.appendChild(el);
            });
            contentEl.appendChild(logosDiv);

            // Date
            const dateEl = document.createElement('div');
            dateEl.className = 'date-input';
            dateEl.contentEditable = 'true';
            dateEl.spellcheck = false;
            dateEl.innerHTML = escHtml(step.dates || '');
            dateEl.placeholder = 'Date…';
            dateEl.addEventListener('blur', () => { step.dates = dateEl.innerText; });
            dateEl.addEventListener('keydown', e => {
                if (e.key === 'Enter')  { e.preventDefault(); document.execCommand('insertLineBreak'); }
                if (e.key === 'Escape') dateEl.blur();
            });
            contentEl.appendChild(dateEl);

            // Actions
            const actions = document.createElement('div');
            actions.className = 'step-actions';

            const addBtn = document.createElement('button');
            addBtn.className = 'step-btn add-btn';
            addBtn.textContent = '+ Logo';
            addBtn.title = 'Ajouter un logo à cette marche';
            addBtn.addEventListener('click', e => { e.stopPropagation(); toggleSelectStep(step.id); });

            const leftBtn = document.createElement('button');
            leftBtn.className = 'step-btn move-btn';
            leftBtn.innerHTML = '←';
            leftBtn.title = 'Déplacer à gauche';
            leftBtn.disabled = i === 0;
            leftBtn.addEventListener('click', e => { e.stopPropagation(); moveStep(step.id, -1); });

            const rightBtn = document.createElement('button');
            rightBtn.className = 'step-btn move-btn';
            rightBtn.innerHTML = '→';
            rightBtn.title = 'Déplacer à droite';
            rightBtn.disabled = i === steps.length - 1;
            rightBtn.addEventListener('click', e => { e.stopPropagation(); moveStep(step.id, 1); });

            const delBtn = document.createElement('button');
            delBtn.className = 'step-btn del-btn';
            delBtn.textContent = '✕';
            delBtn.title = 'Retirer cette marche';
            delBtn.addEventListener('click', e => {
                e.stopPropagation();
                pushHistory();
                steps = steps.filter(s => s.id !== step.id);
                if (selectedStepId === step.id) exitSelectMode();
                renderStaircase();
            });

            actions.appendChild(addBtn);
            actions.appendChild(leftBtn);
            actions.appendChild(rightBtn);
            actions.appendChild(delBtn);
            contentEl.appendChild(actions);

            // Numéro
            const numEl = document.createElement('div');
            numEl.className = 'step-num';
            numEl.textContent = i + 1;
            stepEl.appendChild(numEl);

            stepEl.appendChild(contentEl);
            staircaseContainer.appendChild(stepEl);
        });
    }

    function escHtml(s) {
        return s
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }
});
