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
        const colors = [];
        const count = 3000; // Increased count for luxury feel

        for (let i = 0; i < count; i++) {
            vertices.push(
                THREE.MathUtils.randFloatSpread(1500),
                THREE.MathUtils.randFloatSpread(1500),
                THREE.MathUtils.randFloatSpread(1500)
            );
            
            const color = new THREE.Color();
            color.setHSL(0.5 + Math.random() * 0.1, 0.8, 0.6); // Cyan tones
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        // Add Luxury Atmosphere Lights
        const pointLight = new THREE.PointLight(0x00f0ff, 2, 500);
        pointLight.position.set(0, 0, 50);
        this.scene.add(pointLight);
    },

    triggerLightning() {
        const overlay = document.createElement('div');
        overlay.className = 'lightning-strike';
        document.body.appendChild(overlay);
        
        const strike = () => {
            overlay.classList.add('lightning-active');
            setTimeout(() => {
                overlay.classList.remove('lightning-active');
                if (Math.random() > 0.5) setTimeout(strike, 100); // Double strike
            }, 400);
        };

        setInterval(() => {
            if (Math.random() > 0.98) strike();
        }, 3000);
    },

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.00005;
        this.particles.rotation.y = time * 0.5;
        this.particles.rotation.x = time * 0.2;

        this.camera.position.x += (this.mouseX - this.camera.position.x) * 0.05;
        this.camera.position.y += (-this.mouseY - this.camera.position.y) * 0.05;
        this.camera.lookAt(this.scene.position);

        this.renderer.render(this.scene, this.camera);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ThreeHub.init();
    ThreeHub.triggerLightning();
});
