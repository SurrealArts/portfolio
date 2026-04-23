import './style.css';
import * as THREE from 'three';

const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext('2d', { willReadFrequently: true });
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, 512, 512);
ctx.fillStyle = '#fff';
ctx.font = '24px monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

for (let i = 0; i < 256; i++) {
    const char = String.fromCharCode(i);
    const x = (i % 16) * 32 + 16;
    const y = Math.floor(i / 16) * 32 + 16;
    ctx.fillText(char, x, y);
}

const fontTex = new THREE.CanvasTexture(canvas);
fontTex.needsUpdate = true;
fontTex.flipY = false;
fontTex.minFilter = THREE.NearestFilter;
fontTex.magFilter = THREE.NearestFilter;

const pagesConfig = {
    "about_me": {
        displayName: "0x00_about_me.sys",
        zones: [
            {
                pos: [0.5, 0.5],
                radius: 1.4,
                title: "ABOUT_ME.sys",
                path: "./pages/about_me/01/index.html",
                preview: "Click me to open."
            }
        ]
    },
    "entertainment": {
        displayName: "0x1A_entertainment.bin",
        zones: [
            {
                pos: [0.3, 0.4],
                radius: 0.9,
                title: "GAMES.bin",
                path: "./pages/entertainment/01/index.html",
                preview: "List of games I play"
            },
            {
                pos: [0.7, 0.6],
                radius: 0.7,
                title: "LITERATURE.dll",
                path: "./pages/entertainment/02/index.html",
                preview: "Preferred books, plays, music genres and artists"
            }
        ]
    },
    "projects": {
        displayName: "0xFF_projects.info",
        zones: [
            {
                pos: [0.5, 0.5],
                radius: 1.2,
                title: "Discord Lirdle Activity",
                path: "./pages/projects/01/index.html",
                preview: "Wordle, but... One Lie Per Line"
            }
        ]
    },
};

const navList = document.getElementById('dynamic-nav');
let isFirst = true;
let initialPageId = null;

for (const folderName in pagesConfig) {
    const li = document.createElement('li');
    li.setAttribute('data-page', folderName);
    li.innerHTML = `> ${pagesConfig[folderName].displayName}`;

    if (isFirst) {
        li.classList.add('active');
        initialPageId = folderName;
        isFirst = false;
    }
    navList.appendChild(li);
}

let hotZonesData = pagesConfig[initialPageId]?.zones || [];
const hotZonesUniform = new Float32Array(30);

function updateHotZonesUniforms() {
    material.uniforms.uZoneCount.value = hotZonesData.length;
    hotZonesData.forEach((zone, i) => {
        hotZonesUniform[i * 3] = zone.pos[0];
        hotZonesUniform[i * 3 + 1] = zone.pos[1];
        hotZonesUniform[i * 3 + 2] = zone.radius;
    });
}

const container = document.getElementById('memory-view');
const webglCanvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: webglCanvas, antialias: false });
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const material = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uFont: { value: fontTex },
        uGrid: { value: new THREE.Vector2(100, 50) },
        uAspect: { value: 1.0 },
        uZoneCount: { value: hotZonesData.length },
        uHotZones: { value: hotZonesUniform },
        uModalOpen: { value: 0.0 },
        uGlitchIntensity: { value: 0.0 }
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
    fragmentShader: `
        uniform float uTime;
        uniform sampler2D uFont;
        uniform vec2 uGrid;
        uniform float uAspect;
        
        uniform int uZoneCount;
        uniform vec3 uHotZones[10]; 
        uniform float uModalOpen;
        uniform float uGlitchIntensity;

        varying vec2 vUv;

        float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }

        float noise2D(vec2 p) {
            vec2 ip = floor(p);
            vec2 u = fract(p);
            u = u*u*(3.0-2.0*u);
            float res = mix(
                mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
                mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
            return res*res;
        }

        void main() {
            vec2 fixedUv = vec2(vUv.x, 1.0 - vUv.y);
            vec2 gridPos = floor(fixedUv * uGrid);
            vec2 cellUv = fract(fixedUv * uGrid);

            vec2 cellCenterUv = (gridPos + 0.5) / uGrid;
            vec2 aspectUv = vec2(cellCenterUv.x * uAspect, cellCenterUv.y);

            // ==========================================
            // ANOMALY MAP (Amoeba Morphing & Protected Cores)
            // ==========================================
            float largeIntensity = 0.0;
            float morphNoise = noise2D(aspectUv * 5.0 + uTime * 0.1) * 0.1;

            for(int i = 0; i < 10; i++) {
                if(i < uZoneCount) {
                    vec2 center = vec2(uHotZones[i].x * uAspect, uHotZones[i].y);
                    float radius = uHotZones[i].z * 0.5; 
                    float dist = distance(aspectUv, center);
                    
                    float edgeWarp = morphNoise * smoothstep(0.0, radius, dist);
                    float falloff = exp(-pow((dist + edgeWarp) / radius, 2.0) * 8.0);
                    
                    // Core Protection: Prevents morph noise from wiping out the bright center
                    float coreProtection = smoothstep(radius * 0.6, 0.0, dist);
                    
                    largeIntensity = max(largeIntensity, max(falloff, coreProtection));
                }
            }

            vec2 move1 = aspectUv + vec2(uTime * 0.04, uTime * 0.06);
            vec2 move2 = aspectUv - vec2(uTime * 0.05, uTime * 0.03);
            float smallWaves = noise2D(move1 * 10.0) * noise2D(move2 * 15.0);
            float smallIntensity = smoothstep(0.3, 0.7, smallWaves) * 0.5; 

            float map = clamp(largeIntensity + smallIntensity, 0.0, 1.0);

            // ==========================================
            // MATRIX REACTION & TRANSITION
            // ==========================================
            float colMod = mod(gridPos.x, 2.0);
            if (colMod == 0.0) cellUv.x -= 0.15; 
            if (colMod == 1.0) cellUv.x += 0.15; 

            float sizeScale = mix(1.0, 1.3, map);
            vec2 centeredCellUv = cellUv - 0.5;
            centeredCellUv /= sizeScale;
            cellUv = centeredCellUv + 0.5;

            vec2 samplePos = gridPos;
            float globalScramble = uGlitchIntensity * 20.0; 
            float shakeChance = mix(0.02, 1.0, map) + (uGlitchIntensity * 0.5); 
            float shakeMagnitude = mix(1.0, 3.0, map) + globalScramble;
            
            if (rand(gridPos + uTime) < shakeChance) {
                samplePos.x += floor((rand(gridPos - uTime) - 0.5) * shakeMagnitude);
                samplePos.y += floor((rand(gridPos + uTime * 2.0) - 0.5) * shakeMagnitude);
            }

            // Squashed update frequency
            float updateFreq = mix(0.75, 20.0, pow(map, 1.5)) + globalScramble;
            float timeStep = floor(uTime * updateFreq);
            float noiseVal = rand(samplePos + timeStep);

            float hexIdx = floor(noiseVal * 16.0);
            float ascii = (hexIdx < 10.0) ? (48.0 + hexIdx) : (65.0 + (hexIdx - 10.0));

            // ==========================================
            // COLOR
            // ==========================================
            vec3 dimColor = vec3(0.0, 0.12 + rand(gridPos)*0.08, 0.0);
            vec3 coreColor = vec3(0.8, 1.0, 0.8); 
            
            vec3 color = mix(dimColor, coreColor, pow(map, 1.4));
            color *= mix(0.8 + 0.2 * sin(uTime * 4.0 + rand(gridPos) * 10.0), 1.0, map);
            color *= 1.0 - uGlitchIntensity; // "Memory Flush" fade
            color *= mix(1.0, 0.15, uModalOpen);

            vec2 charGrid = vec2(mod(ascii, 16.0), floor(ascii / 16.0));
            vec2 fontUv = (charGrid + clamp(cellUv, 0.0, 1.0)) / 16.0;
            float alpha = texture2D(uFont, fontUv).r;
            
            if (cellUv.x < -0.1 || cellUv.x > 1.1 || cellUv.y < 0.0 || cellUv.y > 1.0) {
                alpha = 0.0;
            }
            
            gl_FragColor = vec4(color * alpha, 1.0);
        }
    `,
    depthWrite: false,
    depthTest: false
});

const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(plane);
updateHotZonesUniforms();

const tooltipsContainer = document.getElementById('tooltips-container');
const modal = document.getElementById('content-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const btnClose = document.getElementById('btn-close-modal');

const decryptedStates = new Set();
let activeTooltipStates = {};

function buildTooltips() {
    tooltipsContainer.innerHTML = '';
    activeTooltipStates = {};

    hotZonesData.forEach((zone, i) => {
        const t = document.createElement('div');
        t.className = 'decryption-tooltip';
        t.innerHTML = `
            <div class="tooltip-header">DECRYPTING POINTER...</div>
            <div class="tooltip-body">0x00000000</div>
            <div class="tooltip-preview">${zone.preview || ""}</div>
        `;
        tooltipsContainer.appendChild(t);

        activeTooltipStates[i] = {
            dom: t,
            textDOM: t.querySelector('.tooltip-body'),
            prevDOM: t.querySelector('.tooltip-preview'),
            isHovered: false,
            isDecrypting: false,
            decryptInterval: null,
            previewTimeout: null,
            abortTimeout: null
        };
    });
}
buildTooltips();

let globalHoveredZone = -1;

container.addEventListener('mousemove', (e) => {
    if (modal.classList.contains('active')) return;

    const rect = container.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;

    for (let i = 0; i < hotZonesData.length; i++) {
        const center = hotZonesData[i].pos;
        const hitRadius = hotZonesData[i].radius * 0.15;

        const dx = (u - center[0]) * (rect.width / rect.height);
        const dy = v - center[1];
        const state = activeTooltipStates[i];

        if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
            globalHoveredZone = i;
            container.style.cursor = 'crosshair';

            if (!state.isHovered) {
                state.isHovered = true;
                clearTimeout(state.abortTimeout);

                const anchorX = (center[0] * rect.width) + rect.left;
                const anchorY = (center[1] * rect.height) + rect.top;
                state.dom.style.left = `${anchorX}px`;
                state.dom.style.top = `${anchorY}px`;
                state.dom.style.opacity = '1';

                const targetText = hotZonesData[i].title;

                if (decryptedStates.has(targetText)) {
                    state.textDOM.innerText = targetText;
                    state.textDOM.style.color = "#0f0";
                    state.prevDOM.style.opacity = '1';
                } else if (!state.isDecrypting) {
                    startDecryptionAnimation(state, targetText);
                }
            }
        } else {
            if (state.isHovered) {
                state.isHovered = false;
                state.dom.style.opacity = '0';

                const targetText = hotZonesData[i].title;
                if (!decryptedStates.has(targetText)) {
                    state.abortTimeout = setTimeout(() => {
                        clearInterval(state.decryptInterval);
                        clearTimeout(state.previewTimeout);
                        state.isDecrypting = false;

                        state.textDOM.innerText = "0x00000000";
                        state.textDOM.style.color = "#5fff5f";
                        state.prevDOM.style.opacity = '0';
                    }, 300);
                }
            }
        }
    }

    if (Object.values(activeTooltipStates).every(s => !s.isHovered)) {
        globalHoveredZone = -1;
        container.style.cursor = 'default';
    }
});

function startDecryptionAnimation(state, targetText) {
    clearInterval(state.decryptInterval);
    clearTimeout(state.previewTimeout);
    clearTimeout(state.abortTimeout);

    state.isDecrypting = true;
    let iterations = 0;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    state.textDOM.style.color = "#5fff5f";

    state.decryptInterval = setInterval(() => {
        let newText = "";
        for (let i = 0; i < targetText.length; i++) {
            if (i < iterations / 2) newText += targetText[i];
            else newText += chars[Math.floor(Math.random() * chars.length)];
        }
        state.textDOM.innerText = newText;
        iterations++;

        if (iterations / 2 >= targetText.length) {
            clearInterval(state.decryptInterval);
            state.isDecrypting = false;

            state.textDOM.innerText = targetText;
            decryptedStates.add(targetText);

            state.previewTimeout = setTimeout(() => {
                state.prevDOM.style.opacity = '1';
            }, 300);
        }
    }, 25);
}

container.addEventListener('click', (e) => {
    if (globalHoveredZone !== -1 && !modal.classList.contains('active')) {
        const zone = hotZonesData[globalHoveredZone];

        const rect = container.getBoundingClientRect();
        const anchorX = (zone.pos[0] * rect.width) + rect.left;
        const anchorY = (zone.pos[1] * rect.height) + rect.top;

        const modalLeft = window.innerWidth * 0.125;
        const modalTop = window.innerHeight * 0.10;

        modal.style.transformOrigin = `${anchorX - modalLeft}px ${anchorY - modalTop}px`;
        modalTitle.innerText = `[ DUMP: ${zone.title} ]`;
        modalBody.innerHTML = `<iframe src="${zone.path}" frameborder="0" id="injected-frame"></iframe>`;
        modal.classList.add('active');
        material.uniforms.uModalOpen.value = 1.0;

        Object.values(activeTooltipStates).forEach(s => s.dom.style.opacity = '0');
        container.style.cursor = 'default';

        const iframe = document.getElementById('injected-frame');
        setTimeout(() => {
            if (iframe) iframe.classList.add('loaded');
        }, 500);
    }
});

btnClose.addEventListener('click', () => {
    modal.classList.remove('active');
    material.uniforms.uModalOpen.value = 0.0;
    setTimeout(() => { modalBody.innerHTML = ''; }, 300);
});

document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('app-container').classList.toggle('sidebar-collapsed');
});

document.getElementById('dynamic-nav').addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li || li.classList.contains('active')) return;

    document.querySelectorAll('.file-tree li').forEach(el => el.classList.remove('active'));
    li.classList.add('active');

    const pageId = li.getAttribute('data-page');

    Object.values(activeTooltipStates).forEach(s => {
        s.dom.style.opacity = '0';
        clearInterval(s.decryptInterval);
        clearTimeout(s.previewTimeout);
        clearTimeout(s.abortTimeout);
    });
    globalHoveredZone = -1;
    container.style.cursor = 'default';

    let glitchFrame = 0;
    const duration = 30;

    function animateGlitch() {
        glitchFrame++;
        const progress = glitchFrame / duration;
        material.uniforms.uGlitchIntensity.value = Math.sin(progress * Math.PI);

        if (glitchFrame === Math.floor(duration / 2)) {
            const newConfig = pagesConfig[pageId];
            hotZonesData = newConfig ? [...newConfig.zones] : [];

            updateHotZonesUniforms();
            buildTooltips();

            material.uniforms.uTime.value += 50.0;
            modal.classList.remove('active');
            material.uniforms.uModalOpen.value = 0.0;
            modalBody.innerHTML = '';
        }

        if (glitchFrame < duration) {
            requestAnimationFrame(animateGlitch);
        } else {
            material.uniforms.uGlitchIntensity.value = 0.0;
        }
    }
    animateGlitch();
});

const clock = new THREE.Clock();

let physicsWidth = window.innerWidth - 280;
let physicsHeight = window.innerHeight - 40;

function animate() {
    requestAnimationFrame(animate);
    material.uniforms.uTime.value = clock.getElapsedTime();

    const actualWidth = container.clientWidth;
    const actualHeight = container.clientHeight;

    if (webglCanvas.width !== actualWidth || webglCanvas.height !== actualHeight) {
        renderer.setSize(actualWidth, actualHeight, false);
    }

    physicsWidth += (actualWidth - physicsWidth) * 0.05;
    physicsHeight += (actualHeight - physicsHeight) * 0.05;

    material.uniforms.uAspect.value = physicsWidth / physicsHeight;
    material.uniforms.uGrid.value.x = Math.max(Math.floor(physicsWidth / 10), 1);
    material.uniforms.uGrid.value.y = Math.max(Math.floor(physicsHeight / 14), 1);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => { });
animate();

const bootScreen = document.getElementById('boot-sequence');
const bootText = document.getElementById('boot-text');
const spinner = ['-', '\\', '|', '/'];
let spinnerIdx = 0;

const loaderInterval = setInterval(() => {
    bootText.innerText = `[ LOADING_SYSTEM_MEMORY... ${spinner[spinnerIdx]} ]`;
    spinnerIdx = (spinnerIdx + 1) % spinner.length;
}, 100);

setTimeout(() => {
    clearInterval(loaderInterval);
    bootText.innerText = `[ SYSTEM_READY ]`;

    setTimeout(() => {
        bootScreen.style.transition = 'opacity 0.8s ease-out';
        bootScreen.style.opacity = '0';
        material.uniforms.uTime.value = 0;
        setTimeout(() => bootScreen.remove(), 800);
    }, 1000);
}, 1200); 
