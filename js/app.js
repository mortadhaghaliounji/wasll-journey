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
        const DPR        = 2;          // résolution ×2 pour qualité
        const STEP_W     = 160;        // largeur d'une marche
        const BASE_H     = 50;         // hauteur marche 1
        const INC_H      = 40;         // incrément hauteur
        const PAD_L      = 80;         // padding gauche
        const PAD_R      = 60;
        const PAD_T      = 220;        // espace au-dessus pour les logos
        const PAD_B      = 70;
        const LOGO_SIZE  = 80;         // taille des logos
        const LINE_W     = 3;
        const BG         = '#FAFAF8';
        const INK        = '#0C0C0C';
        const RED        = '#D01020';
        const MUTED      = '#aaaaaa';

        const nSteps     = steps.length;
        const maxH       = BASE_H + (nSteps - 1) * INC_H;

        // Calcul taille canvas
        const canvasW = PAD_L + nSteps * STEP_W + PAD_R;
        const canvasH = PAD_T + maxH + PAD_B;

        const cvs = document.createElement('canvas');
        cvs.width  = canvasW * DPR;
        cvs.height = canvasH * DPR;
        const ctx  = cvs.getContext('2d');
        ctx.scale(DPR, DPR);

        // Fond
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Titre
        const title = journeyTitle.value.trim() || 'Mon Parcours Politique';
        ctx.font = `700 28px 'Barlow Condensed', sans-serif`;
        ctx.fillStyle = INK;
        ctx.letterSpacing = '2px';
        ctx.fillText(title.toUpperCase(), PAD_L, 46);
        ctx.letterSpacing = '0px';

        // Ligne rouge décorative sous le titre
        ctx.fillStyle = RED;
        ctx.fillRect(PAD_L, 54, 60, 3);

        // Ligne de base (plancher)
        const floorY = PAD_T + maxH;
        ctx.strokeStyle = INK;
        ctx.lineWidth = LINE_W;
        ctx.beginPath();
        ctx.moveTo(PAD_L, floorY);
        ctx.lineTo(PAD_L + nSteps * STEP_W, floorY);
        ctx.stroke();

        // Flèche sur la ligne de base
        const arrowX = PAD_L + nSteps * STEP_W + 12;
        ctx.beginPath();
        ctx.moveTo(arrowX, floorY - 6);
        ctx.lineTo(arrowX + 14, floorY);
        ctx.lineTo(arrowX, floorY + 6);
        ctx.fillStyle = INK;
        ctx.fill();

        // Dessiner les marches
        const stepPromises = steps.map(async (step, i) => {
            const stepH = BASE_H + i * INC_H;
            const stepX = PAD_L + i * STEP_W;
            const stepY = floorY - stepH;

            // Fond de la marche
            ctx.strokeStyle = INK;
            ctx.lineWidth = LINE_W;
            ctx.strokeRect(stepX, stepY, STEP_W, stepH);

            // Numéro de la marche
            ctx.font = `600 12px 'Syne', sans-serif`;
            ctx.fillStyle = MUTED;
            ctx.textAlign = 'center';
            ctx.fillText(String(i + 1), stepX + STEP_W / 2, floorY - 10);
            ctx.textAlign = 'left';

            // Logos — chargement parallèle (null = logo "?")
            const imgs = await Promise.all(step.imgs.map(src => loadImg(src)));
            // imgs garde le même index que step.imgs, y compris les null (logo ?)
            const n = imgs.length;

            if (n > 0) {
                const cols   = n <= 2 ? n : Math.min(n, 3);
                const logoW  = Math.min(LOGO_SIZE, (STEP_W - 12) / cols);
                const logoH  = logoW;
                const gap    = 4;
                const totalW = cols * logoW + (cols - 1) * gap;
                const rows   = Math.ceil(n / cols);
                const totalH = rows * logoH + (rows - 1) * gap;
                const startX = stepX + (STEP_W - totalW) / 2;
                const startY = stepY - totalH - 16;

                imgs.forEach((img, li) => {
                    const col = li % cols;
                    const row = Math.floor(li / cols);
                    const lx  = Math.round(startX + col * (logoW + gap));
                    const ly  = Math.round(startY + row * (logoH + gap));
                    const lw  = Math.round(logoW);
                    const lh  = Math.round(logoH);

                    if (img) {
                        // Canvas offscreen isolé pour éviter la contamination CORS
                        try {
                            const off = document.createElement('canvas');
                            off.width  = lw * DPR;
                            off.height = lh * DPR;
                            const octx = off.getContext('2d');
                            octx.scale(DPR, DPR);
                            octx.fillStyle = '#FAFAF8';
                            octx.fillRect(0, 0, lw, lh);
                            octx.drawImage(img, 0, 0, lw, lh);
                            off.toDataURL(); // lève une exception si canvas tainté (CORS)
                            // Copie dans le canvas principal, strictement clippé
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(lx, ly, lw, lh);
                            ctx.clip();
                            ctx.drawImage(off, lx, ly, lw, lh);
                            ctx.restore();
                        } catch (e) {
                            drawQmark(ctx, lx, ly, lw, lh, '✕');
                        }
                    } else {
                        drawQmark(ctx, lx, ly, lw, lh, '?');
                    }
                });
            }

            // Dates
            if (step.dates && step.dates.trim()) {
                ctx.font = `600 10px 'Syne', sans-serif`;
                ctx.fillStyle = '#555';
                ctx.textAlign = 'center';
                const lines = step.dates.split('\n');
                const textY = stepY + 18;
                lines.forEach((line, li) => {
                    ctx.fillText(line, stepX + STEP_W / 2, textY + li * 14);
                });
                ctx.textAlign = 'left';
            }
        });

        await Promise.all(stepPromises);

        // Watermark
        ctx.font = `600 11px 'Barlow Condensed', sans-serif`;
        ctx.fillStyle = '#cccccc';
        ctx.textAlign = 'right';
        ctx.fillText('journey.wasll.tn', canvasW - 20, canvasH - 16);
        ctx.textAlign = 'left';

        return cvs.toDataURL('image/png');
    }

    function drawQmark(ctx, lx, ly, lw, lh, char) {
        ctx.fillStyle = '#eeeeee';
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(lx, ly, lw, lh);
        ctx.font = `700 ${Math.round(lw * 0.38)}px 'Barlow Condensed', sans-serif`;
        ctx.fillStyle = '#aaaaaa';
        ctx.textAlign = 'center';
        ctx.fillText(char, lx + lw / 2, ly + lh / 2 + lw * 0.12);
        ctx.textAlign = 'left';
    }

    function loadImg(src) {
        if (!src) return Promise.resolve(null);
        return new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload  = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
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
