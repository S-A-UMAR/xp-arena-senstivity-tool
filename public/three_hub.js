/**
 * XP ARENA - 3D NEURAL HUB
 * Powered by Three.js
 */
const ThreeHub = {
    renderer: null,
    scene: null,
    camera: null,
    particles: null,
    mouseX: 0,
    mouseY: 0,

    init() {
        const container = document.getElementById('three-canvas-container');
        if (!container) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 100;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        this.createParticles();
        this.addEventListeners();
        this.animate();
    },

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const count = 1500;

        for (let i = 0; i < count; i++) {
            vertices.push(
                THREE.MathUtils.randFloatSpread(1000), // x
                THREE.MathUtils.randFloatSpread(1000), // y
                THREE.MathUtils.randFloatSpread(1000)  // z
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.PointsMaterial({
            color: 0x00f0ff,
            size: 2,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        // Add a secondary grid
        const gridHelper = new THREE.GridHelper(1000, 50, 0x00f0ff, 0x001111);
        gridHelper.position.y = -100;
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    },

    addEventListeners() {
        window.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX - window.innerWidth / 2) * 0.05;
            this.mouseY = (e.clientY - window.innerHeight / 2) * 0.05;
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    },

    animate() {
        requestAnimationFrame(() => this.animate());

        this.particles.rotation.x += 0.001;
        this.particles.rotation.y += 0.0015;

        this.camera.position.x += (this.mouseX - this.camera.position.x) * 0.05;
        this.camera.position.y += (-this.mouseY - this.camera.position.y) * 0.05;
        this.camera.lookAt(this.scene.position);

        this.renderer.render(this.scene, this.camera);
    },

    stop() {
        if (this.renderer) {
            this.renderer.dispose();
            const container = document.getElementById('three-canvas-container');
            if (container) container.innerHTML = '';
            this.renderer = null;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ThreeHub.init();
});
