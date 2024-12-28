class Map3DViewer {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            gridSize: options.gridSize || 20,
            cellSize: options.cellSize || 0.05,
            wallHeight: options.wallHeight || 2
        };

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.options.width / this.options.height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.gridMap = null;
        
        this.init();
    }

    init() {
        this.renderer.setSize(this.options.width, this.options.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.scene.background = new THREE.Color(0x1a1a1a);
        this.scene.fog = new THREE.FogExp2(0x1a1a1a, 0.02);

        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.addLights();

        this.addGrid();

        this.animate();
    }

    addLights() {
        const ambientLight = new THREE.AmbientLight(0x4466aa, 0.4);
        this.scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        const pointLight1 = new THREE.PointLight(0x3366ff, 0.5, 20);
        pointLight1.position.set(5, 5, 5);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x33ccff, 0.5, 20);
        pointLight2.position.set(-5, 5, -5);
        this.scene.add(pointLight2);
    }

    addGrid() {
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const gridHelper = new THREE.GridHelper(50, 50, 0x666666, 0x444444);
        this.scene.add(gridHelper);
    }

    updateMap(occupancyGrid) {
        if (this.gridMap) {
            this.scene.remove(this.gridMap);
        }

        this.gridMap = new THREE.Group();

        const width = occupancyGrid.info.width || occupancyGrid.width;
        const height = occupancyGrid.info.height || occupancyGrid.height;
        const data = occupancyGrid.data;
        const resolution = occupancyGrid.info.resolution || occupancyGrid.resolution || 0.05;

        const wallGeometry = new THREE.BoxGeometry(
            this.options.cellSize,
            this.options.wallHeight,
            this.options.cellSize
        );
        const wallMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.9,
            metalness: 0.5,
            roughness: 0.3,
            clearcoat: 0.1,
            clearcoatRoughness: 0.4,
            envMapIntensity: 1.0,
            reflectivity: 0.5
        });

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const value = data[y * width + x];
                if (value > 50) { 
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(
                        (x - width/2) * this.options.cellSize,
                        this.options.wallHeight/2,
                        (y - height/2) * this.options.cellSize
                    );
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.gridMap.add(wall);
                }
            }
        }

        this.scene.add(this.gridMap);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setSize(width, height) {
        this.options.width = width;
        this.options.height = height;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}