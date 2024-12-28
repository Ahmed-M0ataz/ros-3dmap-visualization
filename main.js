const app = new Vue({
    el: '#app',
    data: {
        ros: null,
        rosbridge_address: 'ws://0.0.0.0:9090',
        connected: false,
        map3dViewer: null,

        mapViewer: null,
        mapGridClient: null,
        mapViewerControl: null,
        mapNavClientControl: null,
        interval: null,

        mapSettings: {
            width: 800,
            height: 600,
            gridResolution: 0.05,
            gridSize: 20
        }
    },
    
    methods: {

        toggleConnection() {
            if (this.connected) {
                this.disconnect();
            } else {
                this.connect();
            }
        },
        
        connect() {
            this.ros = new ROSLIB.Ros({
                url: this.rosbridge_address
            });

            this.ros.on('connection', () => {
                this.connected = true;
                console.log('Connected to ROSBridge!');
                this.showNotification('Connected to Robot', 'success');
                this.initializeMap();
            });

            this.ros.on('error', (error) => {
                console.error('ROSBridge error:', error);
                this.showNotification('Connection Error', 'error');
            });

            this.ros.on('close', () => {
                this.connected = false;
                console.log('ROSBridge connection closed');
                this.showNotification('Disconnected from Robot', 'info');
            });
        },

        disconnect() {
            if (this.ros) {
                this.ros.close();
                this.cleanupMap();
            }
        },

        initializeMapping() {
            if (!this.ros) {
                this.showNotification('Please connect to ROS first', 'error');
                return;
            }
            
            try {
                if (this.mapViewer || this.map3dViewer) {
                    document.getElementById('map').innerHTML = '';
                }
                
                console.log('Initializing 3D map viewer...');
                
                this.map3dViewer = new Map3DViewer('map', {
                    width: this.mapSettings.width,
                    height: this.mapSettings.height,
                    wallHeight: 1.5,
                    cellSize: 0.05
                });

                const mapTopic = new ROSLIB.Topic({
                    ros: this.ros,
                    name: '/map',
                    messageType: 'nav_msgs/OccupancyGrid'
                });

                mapTopic.subscribe((message) => {
                    console.log('Received map update');
                    this.map3dViewer.updateMap(message);
                });

                console.log('Grid client setup complete');

                this.mapGridClient.on('change', () => {
                    console.log('Map update received');
                    this.mapViewer.scaleToDimensions(
                        this.mapGridClient.currentGrid.width,
                        this.mapGridClient.currentGrid.height
                    );
                    this.mapViewer.shift(
                        this.mapGridClient.currentGrid.pose.position.x,
                        this.mapGridClient.currentGrid.pose.position.y
                    );
                    this.showNotification('Map updated', 'info');
                });

                console.log('Map initialization complete');
                this.showNotification('Map viewer initialized', 'success');
            } catch (error) {
                console.error('Error initializing map:', error);
                this.showNotification('Failed to initialize map: ' + error.message, 'error');
                
                if (this.mapViewer) {
                    document.getElementById('map').innerHTML = '';
                    this.mapViewer = null;
                }
                if (this.mapGridClient) {
                    this.mapGridClient = null;
                }
            }
        },

        initializeMap() {
            this.initializeMapping();
        },

        cleanupMap() {
            if (this.mapViewer) {
                document.getElementById('map').innerHTML = '';
                this.mapViewer = null;
            }
            if (this.mapViewerControl) {
                this.mapViewerControl = null;
            }

            
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        },

        showNotification(message, type = 'info') {
            console.log(`${type.toUpperCase()}: ${message}`);
        },

        startMapping() {
            this.showNotification('Starting mapping process...', 'info');
            this.initializeMap();
        },

        resetView() {
            if (this.mapViewer) {
                this.mapViewer.scene.x = 0;
                this.mapViewer.scene.y = 0;
                this.mapViewer.scene.scaleX = 1;
                this.mapViewer.scene.scaleY = 1;
            }
        }
    },

    mounted() {
        window.addEventListener('mouseup', this.stopDrag);
        window.addEventListener('mouseleave', this.stopDrag);

        if (this.rosbridge_address) {
            this.connect();
        }
    },

    beforeDestroy() {
        window.removeEventListener('mouseup', this.stopDrag);
        window.removeEventListener('mouseleave', this.stopDrag);
        this.disconnect();
    }
});