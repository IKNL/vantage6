'use strict';

$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
    if (options.url != '/api/token') {
        var token = localStorage.getItem('access_token');
        if (token) {
            console.log('setting access token to ajax request');
            jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);

        } else {
            console.log('no token available ...');
        }
    }
});

$.ajaxSetup({
    dataType: 'json',
    contentType: 'application/json',
    processData: false,
    beforeSend: function(jqXHR, options) {
        if (options.contentType == "application/json" && typeof options.data != "string") {
            options.data = JSON.stringify(options.data);
        }
    }
});


class Application extends React.Component {
    constructor(props) {
        super(props);

        this.storage = window.localStorage;

        this.state = {
            access_token: this.storage.getItem('access_token'),
            refresh_token: '',
            username: this.storage.getItem('username') || ''
        };     

        this.onLogin = this.onLogin.bind(this);
        this.onLogout = this.onLogout.bind(this);
    };

    onLogin(username, access_token, refresh_token) {
        console.log('onLogin: ', username);
        console.log('setting state ... ');

        // setState triggers rerendering of components, so
        // this has to happen *before* setState
        this.storage.setItem('username', username);
        this.storage.setItem('access_token', access_token);

        this.setState({
            username: username,
            access_token: access_token,
            refresh_token: refresh_token
        });
    };

    onLogout() {
        console.log('onLogout: ', this.state.username);

        this.storage.setItem('access_token', '');        
        this.storage.setItem('refresh_token', '');        

        this.setState({
            access_token: '',
            refresh_token: ''
        });
    }

    render() {
        if (this.state.access_token) {
            return(
                <Dashboard 
                    app={this}
                    username={this.state.username}
                    onLogout={this.onLogout}
                    />
            )
        }

        // console.log('No access token, displaying login screen!');
        return(
            <Login 
                username={this.state.username}
                onLogin={this.onLogin}
                />
        )
    };
};

class Login extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
          username: props.username,
          password: ''
        };

        // FIXME: this is ugly. wondering if there's another way?
        this.updateUsername = this.updateUsername.bind(this);
        this.updatePassword = this.updatePassword.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    };

    updateUsername(event) {
        this.setState({username: event.target.value});
    }

    updatePassword(event) {
        this.setState({password: event.target.value}); 
    }

    handleSubmit(event) {
        //alert('The form was submitted: ' + this.state.value);
        // this.props.handleLogin(this.state.username, this.state.password);
        const username = this.state.username;
        const password = this.state.password;
        const ctx = this;

        $.post({
            url: "/api/token/user",
            data: {
                username: username, 
                password: password
            },
        })
        .done(function(data) {
            console.log("successfully authenticated!");
            // ctx.setState({username: username});
            // ctx.setState({access_token: data.access_token});
            // ctx.setState({refresh_token: data.refresh_token});
            // ctx.setState({refresh_url: data.refresh_url});
            // ctx.setState({user_url: data.user_url});

            $('#login-form').fadeOut(200, function() {
                console.log('notifying Application ...')
                ctx.props.onLogin(
                    username, 
                    data.access_token, 
                    data.refresh_token
                );
            });
        })
        .fail(function(data) {
            console.log("failure:", data);
            var color = $('#login-form').css('border-color');
            var duration = 200;
            $('#login-form').animate({borderColor: '#f00'}, duration, function() {
                $('#login-form').animate({borderColor: color}, duration);
            });
        });

        event.preventDefault();
    };

    render() {
        return (
            <div className="login-content">
               <div id="login-form">

                 <form onSubmit={this.handleSubmit}>
                   <div className="form-group">
                     <label>username</label>
                     <input type="username" className="form-control" placeholder="username"value={this.state.username}onChange={this.updateUsername}/>
                   </div>

                   <div className="form-group">
                     <label>password</label>
                     <input type="password" className="form-control" placeholder="password"value={this.state.password}onChange={this.updatePassword}/>
                   </div>

                   <button type="submit" className="btn btn-primary">Submit</button>
                 </form>

               </div>
             </div>    
        );
    }
};

class DashboardBlankDisplay extends React.Component {
    render() {
        return(
            <div>
                <div className="dashboard-header">
                    cheddar header
                </div>
                <div>blank</div>
            </div>
        )
    }
};

class DashboardTabDisplay extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            key: 1
        }

        this.handleSelect = this.handleSelect.bind(this);
    }

    handleSelect(key) {
        // alert(`selected ${key}`);
        console.log(`selected ${key}`);

        this.setState({
            key: key
        });

    }

    render() {
        var Tabs = ReactBootstrap.Tabs;
        var Tab = ReactBootstrap.Tab;

        return(
            <Tabs 
                bsStyle="pills"
                activeKey={this.state.key}
                onSelect={this.handleSelect}
                mountOnEnter={true}
                id="bottom-tabs"
                >
              <Tab eventKey={1} title="LOG">
                <DashboardLogDisplay
                    socket={this.props.socket}
                />
              </Tab>
              <Tab eventKey={2} title="TERMINAL">
                <DashboardTerminalDisplay />
              </Tab>
              <Tab eventKey={3} title="Tab 3" disabled>
                Tab 3 content
              </Tab>
            </Tabs>
        );
    };
};

class DashboardNavDisplay extends React.Component {
    render() {
        return(
            <div className="dashboard-nav">
                <span>user: <b>{this.props.username}</b></span>
                <span className="logout"><a href="" onClick={this.props.onLogout}>logout</a></span>
            </div>
        ) 
    }
};

class DashboardNodeDisplay extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            access_token: localStorage.getItem('access_token')
        };
    }

    updateState(ctx) {
        $.get({
            url: '/api/stats'
        }).done(function(data) {
            ctx.setState({
                'collaborations': data.collaborations
            });
        });
    }

    componentDidMount() {
        var socket = this.props.socket;
        var ctx = this;

        if (socket) {
            socket.on('connect', function() {
                socket.on("node-status-changed", function(data) {
                    console.log('node-status-changed', data);
                    ctx.updateState(ctx);
                });            
            });

            this.updateState(this);            
        }
    }

    renderNode(node) {
        var status;

        if (node.status == 'offline') {
            status = <span className='small right red'>{node.status}</span>
        } else {
            status = <span className='small right green'>{node.status}</span>
        }

        return(
            <div key={node.id}>
                <span className="small">{node.organization.name}</span>
                {status}
            </div>
        )
    }

    renderCollaboration(collaboration) {
        var nodes = [];
        for (var idx in collaboration.nodes) {
            nodes.push(this.renderNode(collaboration.nodes[idx]));
        }

        return(
            <div key={collaboration.id} className="dashboard-collaboration">
                <h4>{collaboration.name}</h4>
                {nodes}
            </div>
        )
    }

    render() {
        const collaborations = this.state.collaborations;
        var rc = [];

        for (var idx in collaborations) {
            rc.push(this.renderCollaboration(collaborations[idx]));
        }

        return(
            <div>
                <div className="dashboard-header">
                    Collaborations
                </div>
                <div>{rc}</div>
            </div>
        );
    };
};

class DashboardTerminalDisplay extends React.Component {

    componentDidMount() {
        var token = localStorage.getItem('access_token');
        var socket_options = {
          transportOptions: {
            polling: {
              extraHeaders: {
                Authorization: "Bearer " + token
              }
            }
          }
        };

        console.log('socket_options: ', socket_options);

        var socket = io.connect('/pty', socket_options);
        socket.on('connect', function() {
            var term = new Terminal({
              screenKeys: true,
              cursorBlink: true,
              cursorStyle: "underline",
              fontSize: 11,
              fontFamily: 'fira_mono',
              allowTransparency: true,
              theme: {
                // background: '#0e1326'
                background: 'rgba(0, 0, 0, 0.0)',
              }
            });

            // define event handlers
            term.on('key', (key, ev) => {
              socket.emit("pty-input", {"input": key})
            });

            term.on('title', function(title) {
              console.log('title:', title)
              document.title = title;
            });

            socket.on("pty-output", function(data) {
              term.write(data.output)
            })

            socket.on('disconnect', function() {
              console.log("disconnected pty!!!!")
              term.destroy();
              socket.close();
              socket.open();
            });


            function debounce(func, wait_ms) {
              let timeout
              return function(...args) {
                const context = this
                clearTimeout(timeout)
                timeout = setTimeout(() => func.apply(context, args), wait_ms)
              }
            }

            function fitToscreen() {
              term.fit()
              socket.emit("resize", {"cols": term.cols, "rows": term.rows})
            }

            // open the terminal
            term.open(document.getElementById('terminal'));
            const wait_ms = 50;
            window.onresize = debounce(fitToscreen, wait_ms);

            // term.toggleFullScreen(true)
            term.fit();
            //term.textarea.focus();
        });
    }    

    render() {
        return(
            <div className="dashboard-panel">
                <div id="terminal"></div>
            </div>
        ) 
    }
};

class DashboardLogDisplay extends React.Component {
    constructor(props) {
        super(props);
        this.term = null;
        // this.connectSocketEvents = this.connectSocketEvents.bind(this);
    }

    /*
    // This is only necesary if the socket provided throug `this.props`
    // is not connected when `componentDidMount()` is called.
    componentDidUpdate(prevProps, prevState, snapshot) {
        console.log('componentDidUpdate')

        if (this.props.socket !== prevProps.socket) {
            console.log('*** new socket ***');
            this.connectSocketEvents(this.props.socket);
        } else if (this.props.socket === null) {
            console.log('no socket :-(');
        } else {
            console.log('no change in sockets');
        }
    }
    */

    componentDidMount() {
        var socket = this.props.socket;

        if (socket) {
            var _this = this;

            // For some reason this doesn't always work?
            // Delay opening the terminal until all fonts have loaded.
            /*
            document.fonts.ready.then(function () {
                console.log('All fonts in use by visible text have loaded.');
                console.log('fira_mono loaded? ' + document.fonts.check('11px fira_mono'));

                _this.connectSocketEvents(socket);
            });
            */

            this.connectSocketEvents(socket);
        } else {
            console.log('DashboardLogDisplay.componentDidMount() - no socket :-(');
        }
    }

    connectSocketEvents(socket) {
        console.log('DashboardLogDisplay.connectSocketEvents()')

        // define event handlers
        socket.on("append-log", function(data) {
            if (this.term) {
                this.term.writeln(data);
            } else {
                console.warn('this.term is not set!');
            }
        });

        socket.on('disconnect', function() {
          console.log("disconnected /admin!!!!");
          if (this.term) {
              this.term.destroy();
          } else {
              console.warn('this.term is not set!');
          }

          socket.close();
          socket.open();
        });


        function debounce(func, wait_ms) {
          let timeout
          return function(...args) {
            const context = this
            clearTimeout(timeout)
            timeout = setTimeout(() => func.apply(context, args), wait_ms)
          }
        }

        function fitToscreen() {
            console.log(this.term);
            this.term.fit();
            socket.emit("resize", {"cols": this.term.cols, "rows": this.term.rows})
        }

        socket.on('connect', function() {
            console.log('DashboardLogDisplay *** connected ***');
            console.log(socket);

            this.term = new Terminal({
              screenKeys: true,
              cursorBlink: true,
              cursorStyle: "underline",
              fontSize: 11,
              fontFamily: 'courier new',
              allowTransparency: true,
              theme: {
                // background: '#0e1326'
                background: 'rgba(0, 0, 0, 0.0)',
              }
            });


            // open the terminal
            this.term.open(document.getElementById('log'));
            const wait_ms = 50;
            window.onresize = debounce(fitToscreen, wait_ms);

            this.term.fit();
        });
    }    

    render() {
        if (this.term) {
            this.term.fit();        
        }

        return(
            <div className="dashboard-panel">
                <div id="log"></div>
            </div>
        );
    };
};

class DashboardGlobeDisplay extends React.Component {
    componentDidMount() {
        //this.renderGlobe();
        this.renderEncomGlobe();
        // this.renderFlamoxGlobe();
    }

    renderFlamoxGlobe() {
        console.log('renderFlamoxGlobe');

        // Three group objects
        this.groups = {
            main: null, // A group containing everything
            globe: null, // A group containing the globe sphere (and globe dots)
            globeDots: null, // A group containing the globe dots
            lines: null, // A group containing the lines between each country
            lineDots: null // A group containing the line dots
        };

        // Map properties for creation and rendering
        this.props_ = {
            mapSize: {
                // Size of the map from the intial source image (on which the dots are positioned on)
                width: 2048 / 2,
                height: 1024 / 2
            },
            globeRadius: 200, // Radius of the globe (used for many calculations)
            dotsAmount: 20, // Amount of dots to generate and animate randomly across the lines
            startingCountry: 'hongkong', // The key of the country to rotate the camera to during the introduction animation (and which country to start the cycle at)
            colours: {
                // Cache the colours
                globeDots: 'rgb(61, 137, 164)', // No need to use the Three constructor as this value is used for the HTML canvas drawing 'fillStyle' property
                lines: new THREE.Color('#18FFFF'),
                lineDots: new THREE.Color('#18FFFF')
            },
            alphas: {
                // Transparent values of materials
                globe: 0.4,
                lines: 0.5
            }
        };

        // Angles used for animating the camera
        this.camera = {
            object: null, // Three object of the camera
            controls: null, // Three object of the orbital controls
            angles: {
                // Object of the camera angles for animating
                current: {
                    azimuthal: null,
                    polar: null
                },
                target: {
                    azimuthal: null,
                    polar: null
                }
            }
        };

        // Booleans and values for animations
        this.animations = {
            finishedIntro: false, // Boolean of when the intro animations have finished
            dots: {
                current: 0, // Animation frames of the globe dots introduction animation
                total: 170, // Total frames (duration) of the globe dots introduction animation,
                points: [] // Array to clone the globe dots coordinates to
            },
            globe: {
                current: 0, // Animation frames of the globe introduction animation
                total: 80, // Total frames (duration) of the globe introduction animation,
            },
            countries: {
                active: false, // Boolean if the country elements have been added and made active
                animating: false, // Boolean if the countries are currently being animated
                current: 0, // Animation frames of country elements introduction animation
                total: 120, // Total frames (duration) of the country elements introduction animation
                selected: null, // Three group object of the currently selected country
                index: null, // Index of the country in the data array
                timeout: null, // Timeout object for cycling to the next country
                initialDuration: 5000, // Initial timeout duration before starting the country cycle
                duration: 2000 // Timeout duration between cycling to the next country
            }
        };

        // Boolean to enable or disable rendering when window is in or out of focus
        this.isHidden = false;


        function returnSphericalCoordinates(latitude, longitude) {
            /*
                This function will take a latitude and longitude and calculate the
                projected 3D coordiantes using Mercator projection relative to the
                radius of the globe.

                Reference: https://stackoverflow.com/a/12734509
            */

            // Convert latitude and longitude on the 90/180 degree axis
            latitude = ((latitude - props.mapSize.width) / props.mapSize.width) * -180;
            longitude = ((longitude - props.mapSize.height) / props.mapSize.height) * -90;

            // Calculate the projected starting point
            var radius = Math.cos(longitude / 180 * Math.PI) * props.globeRadius;
            var targetX = Math.cos(latitude / 180 * Math.PI) * radius;
            var targetY = Math.sin(longitude / 180 * Math.PI) * props.globeRadius;
            var targetZ = Math.sin(latitude / 180 * Math.PI) * radius;

            return {
                x: targetX,
                y: targetY,
                z: targetZ
            };
        }

        function getData(ctx) {
            $.get('js/lib/flamov-globe/globe-points.json')
            .done(function(data) {
                ctx.data = data;
                setupScene(ctx);
            });
        };

        function setupScene(ctx) {
            ctx.scene = new THREE.Scene();
            ctx.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                shadowMapEnabled: false
            });

            var globe = $('#globe');
            globe.append(ctx.renderer.domElement);

            ctx.renderer.setSize(globe.clientWidth, globe.clientHeight);
            console.log('ctx.rendere', ctx.renderer);

            ctx.renderer.setPixelRatio(1);
            ctx.renderer.setClearColor(0x000000, 0);

            // Main group that contains everything
            ctx.groups.main = new THREE.Group();
            ctx.groups.main.name = 'Main';

            // Group that contains lines for each country
            ctx.groups.lines = new THREE.Group();
            ctx.groups.lines.name = 'Lines';
            ctx.groups.main.add(ctx.groups.lines);

            // Group that contains dynamically created dots
            ctx.groups.lineDots = new THREE.Group();
            ctx.groups.lineDots.name = 'Dots';
            ctx.groups.main.add(ctx.groups.lineDots);

            // Add the main group to the scene
            ctx.scene.add(ctx.groups.main);

            // Render camera and add orbital controls
            addCamera(ctx.camera, ctx.props_);
            addControls(ctx.camera, ctx.props_);

            // Render objects
            addGlobe(ctx, ctx.props_);

            if (Object.keys(ctx.data.countries).length > 0) {
                // addLines();
                // createListElements();
            }

            // Start the requestAnimationFrame loop
            render_frame(ctx);
            animate_scene(ctx);

            var canvasResizeBehaviour = function() {
                var container = $('#globe')[0];

                // container.width = window.innerWidth;
                // container.height = window.innerHeight;
                // container.style.width = window.innerWidth + 'px';
                // container.style.height = window.innerHeight + 'px';

                ctx.camera.object.aspect = container.offsetWidth / container.offsetHeight;
                ctx.camera.object.updateProjectionMatrix();
                ctx.renderer.setSize(container.offsetWidth, container.offsetHeight);
            };

            window.addEventListener('resize', canvasResizeBehaviour);
            window.addEventListener('orientationchange', function() {
                setTimeout(canvasResizeBehaviour, 0);
            });

            canvasResizeBehaviour();
        };

        function addCamera(camera, props) {
            var canvas = $('#globe');
            camera.object = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 1, 10000);
            camera.object.position.z = props.globeRadius * 2.2;
        };

        function addControls(camera, props) {
            console.log('disabling camera controls');
            // var canvas = $('#globe');
            var canvas = document.getElementById('globe');
            // console.log('canvas:', canvas);
            // console.log('canvas:', document.getElementById('globe'));

            camera.controls = new OrbitControls(camera.object, canvas);
            camera.controls.enableKeys = false;
            camera.controls.enablePan = false;
            camera.controls.enableZoom = false;
            camera.controls.enableDamping = false;
            camera.controls.enableRotate = false;

            // Set the initial camera angles to something crazy for the introduction animation
            camera.angles.current.azimuthal = -Math.PI;
            camera.angles.current.polar = 0;
        };

        function addGlobe(ctx, props) {
            var textureLoader = new THREE.TextureLoader();
            textureLoader.setCrossOrigin(true);

            var radius = props.globeRadius - (props.globeRadius * 0.02);
            var segments = 64;
            var rings = 64;

            // Make gradient
            var canvasSize = 128;
            var textureCanvas = document.createElement('canvas');
            textureCanvas.width = canvasSize;
            textureCanvas.height = canvasSize;

            var canvasContext = textureCanvas.getContext('2d');
            canvasContext.rect(0, 0, canvasSize, canvasSize);

            var canvasGradient = canvasContext.createLinearGradient(0, 0, 0, canvasSize);
            canvasGradient.addColorStop(0, '#5B0BA0');
            canvasGradient.addColorStop(0.5, '#260F76');
            canvasGradient.addColorStop(1, '#130D56');
            canvasContext.fillStyle = canvasGradient;
            canvasContext.fill();

            // Make texture
            var texture = new THREE.Texture(textureCanvas);
            texture.needsUpdate = true;

            var geometry = new THREE.SphereGeometry(radius, segments, rings);
            var material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0
            });

            var globe = new THREE.Mesh(geometry, material);

            ctx.groups.globe = new THREE.Group();
            ctx.groups.globe.name = 'Globe';

            ctx.groups.globe.add(globe);
            ctx.groups.main.add(ctx.groups.globe);

            addGlobeDots(ctx, props);
        };

        function addGlobeDots(ctx, props) {
            var geometry = new THREE.Geometry();

            // Make circle
            var canvasSize = 16;
            var halfSize = canvasSize / 2;

            var textureCanvas = document.createElement('canvas');
            textureCanvas.width = canvasSize;
            textureCanvas.height = canvasSize;

            var canvasContext = textureCanvas.getContext('2d');
            canvasContext.beginPath();
            canvasContext.arc(halfSize, halfSize, halfSize, 0, 2 * Math.PI);
            canvasContext.fillStyle = props.colours.globeDots;
            canvasContext.fill();

            // Make texture
            var texture = new THREE.Texture(textureCanvas);
            texture.needsUpdate = true;

            var material = new THREE.PointsMaterial({
                map: texture,
                size: props.globeRadius / 120
            });

            var addDot = function(targetX, targetY) {
                // Add a point with zero coordinates
                var point = new THREE.Vector3(0, 0, 0);
                geometry.vertices.push(point);

                // Add the coordinates to a new array for the intro animation
                var result = returnSphericalCoordinates(
                    targetX,
                    targetY
                );

                ctx.animations.dots.points.push(new THREE.Vector3(result.x, result.y, result.z));
            };

            for (var i = 0; i < ctx.data.points.length; i++) {
                addDot(ctx.data.points[i].x, ctx.data.points[i].y);
            }

            for (var country in ctx.data.countries) {
                addDot(ctx.data.countries[country].x, ctx.data.countries[country].y);
            }

            // Add the points to the scene
            ctx.groups.globeDots = new THREE.Points(geometry, material);
            ctx.groups.globe.add(ctx.groups.globeDots);
        }


        function animate_scene(ctx) {
            if (ctx.isHidden === false) {
                requestAnimationFrame(function() {
                    animate_scene(ctx);
                });
            }

            if (ctx.groups.globeDots) {
                // introAnimate();
            }

            if (ctx.animations.finishedIntro === true) {
                // animateDots();
            }

            if (ctx.animations.countries.animating === true) {
                // animateCountryCycle();
            }

            // positionElements();

            ctx.camera.controls.update();
            render_frame(ctx);
        }

        function render_frame(ctx) {
            ctx.renderer.render(ctx.scene, ctx.camera.object);
        }


        // Kick things off!
        getData(this);
    }

    renderEncomGlobe() {
        const width = $('#globe').width();
        const height = $('#globe').height();

        var globe = new ENCOM.Globe(width, height, {
            font: "monaco",
            // data: data.slice(), 
            tiles: grid.tiles,
            baseColor: 'cyan',
            markerColor: 'yellow',
            pinColor: 'cyan',
            satelliteColor: 'orange',
            scale: 1,
            dayLength: 1000 * 30,
            introLinesDuration: 2000,
            maxPins: 500,
            maxMarkers: 500,
            viewAngle: 0.8
        });

        $("#globe").append(globe.domElement);
        globe.init(start);
        globe.renderer.setClearColor('#000000', 0);
        // globe.renderer.setPixelRatio(window.devicePixelRatio);

        function animate() {
            if (globe) {
                globe.tick();
            }

            requestAnimationFrame(animate);
        }

        function start(){
            animate();

            /* add pins at random locations */
            // setInterval(function(){
            //     var lat = Math.random() * 180 - 90,
            //        lon = Math.random() * 360 - 180,
            //        name = "Test " + Math.floor(Math.random() * 100);

            //     globe.addPin(lat,lon, name);

            // }, 5000);

            // setTimeout(function() {
            //     var constellation = [];
            //     var opts = {
            //         coreColor: 'orange',
            //         numWaves: 8
            //     };
            //     var alt =  1.3;

            //     for(var i = 0; i< 2; i++){
            //         for(var j = 0; j< 3; j++){
            //              constellation.push({
            //                 lat: 50 * i - 30 + 15 * Math.random(), 
            //                  lon: 120 * j - 120 + 30 * i, 
            //                  altitude: alt
            //                  });
            //         }
            //     }

            //     globe.addConstellation(constellation, opts);
            // }, 4000);

            /* add the connected points that are in the movie */
            setTimeout(function(){
                globe.addMarker(23.6978, 120.9605, "Taipei", true);
                globe.addPin(23.6978, 120.9605, "").hideSmoke();

                globe.addMarker(52.0907, 5.1214, "Utrecht", true);
                globe.addPin(52.0907, 5.1214, "").hideSmoke();

                globe.addMarker(41.9028, 12.4964, "Rome", true);
                globe.addPin(41.9028, 12.4964, "").hideSmoke();
            }, 2000);

            // setTimeout(function(){
            //     globe.addPin(49.25, -123.1, "Vancouver");
            //     globe.addPin(35.6895, 129.69171, "Tokyo", true);
            // }, 2000);
        }

    }

    renderGlobe() {
        // Parameters
        const width = $('#globe').width();
        const height = $('#globe').height();
        var webglEl = document.getElementById('globe');

        var radius = 0.5,
            segments = 32,
            rotation = 6;  

        var scene = new THREE.Scene();

        var camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
        camera.position.z = 1.5;

        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);

        scene.add(new THREE.AmbientLight(0x333333));

        var light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5,3,5);
        scene.add(light);

        var sphere = createSphere(radius, segments);
        sphere.rotation.y = rotation; 
        scene.add(sphere);

        // var clouds = createClouds(radius, segments);
        // clouds.rotation.y = rotation;
        // scene.add(clouds);

        // var stars = createStars(90, 64);
        // scene.add(stars);

        // var controls = new THREE.TrackballControls(camera);

        webglEl.appendChild(renderer.domElement);
        render_frame()

        function render_frame() {
            // controls.update();
            sphere.rotation.y += 0.0015;
            // clouds.rotation.y += 0.0005;    
            requestAnimationFrame(render_frame);
            renderer.render(scene, camera);
        }

        function createSphere(radius, segments) {
            return new THREE.Mesh(
                new THREE.SphereGeometry(radius, segments, segments),
                new THREE.MeshPhongMaterial({
                    // map:         THREE.ImageUtils.loadTexture('img/map_outline.png')
                    map:         THREE.ImageUtils.loadTexture('img/2_no_clouds_4k.jpg')
                    // bumpMap:     THREE.ImageUtils.loadTexture('img/elev_bump_4k.jpg'),
                    // bumpScale:   0.005,
                    // specularMap: THREE.ImageUtils.loadTexture('img/water_4k.png'),
                    // specular:    new THREE.Color('grey')                
              })
            );
        }

        function createClouds(radius, segments) {
            return new THREE.Mesh(
                new THREE.SphereGeometry(radius + 0.003, segments, segments),     
                new THREE.MeshPhongMaterial({
                    map:         THREE.ImageUtils.loadTexture('img/fair_clouds_4k.png'),
                    transparent: true
                })
            );    
        }

        function createStars(radius, segments) {
            return new THREE.Mesh(
                new THREE.SphereGeometry(radius, segments, segments), 
                new THREE.MeshBasicMaterial({
                    map:  THREE.ImageUtils.loadTexture('img/galaxy_starfield.png'), 
                    side: THREE.BackSide
                })
            );
        }        
    }

    render() {
        return(
            <div>
                <div className="dashboard-header">World view</div>
                <div className="dashboard-panel">
                    <div id="globe"></div>
                </div>
            </div>
        )
    }
};

class DashboardClockDisplay extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            date: new Date()
        };
    }

    componentDidMount() {
        this.timerID = setInterval(
          () => this.tick(),
          1000
        );
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    tick() {
        this.setState({
            date: new Date()
        });
    }


    render() {
        return(
            <div className="dashboard-clock">
                {strftime('%H:%M:%S', this.state.date)}
            </div>
        );
    }
};

class Dashboard extends React.Component {
    constructor(props) {
        super(props);
        this.app = props.app;

        var token = localStorage.getItem('access_token');
        this.socket_options = {
          transportOptions: {
            polling: {
              extraHeaders: {
                Authorization: "Bearer " + token
              }
            }
          }
        };

        Terminal.applyAddon(fit);

        this.state = {
            admin_socket: io.connect('/admin', this.socket_options)
        };
    };

    componentDidMount() {
        var socket = this.state.admin_socket;

        socket.on('error', (error) => {
            console.log('error: ', error);
            this.app.onLogout();
        });

        socket.on('connect_error', (error) => {
            console.log('connect_error: ', error);
            // this.app.onLogout();
        });

        socket.on('disconnect', (reason) => {
            console.log('disconnect: ', reason);
            alert(reason);
        });
    };

    render() {
        return(
            <div className="dashboard-outer">
                <DashboardNavDisplay 
                    username={this.props.username} 
                    onLogout={this.props.onLogout}
                    />

                <div className="container-fluid dashboard-content">

                    <div className="row">
                        <div className="col-xs-3">
                            <DashboardClockDisplay />

                            <DashboardNodeDisplay
                                app={this.app} 
                                socket={this.state.admin_socket}
                            />
                        </div>

                        <div className="col-xs-6">
                            <div className="dashboard-header">Cheddar header</div>
                            what shall we put here?
                        </div>

                        <div className="col-xs-3">
                            <DashboardGlobeDisplay 
                                app={this.app}
                                socket={this.state.admin_socket}
                            />
                        </div>
                    </div>
                    
                    <div className="row">
                        <div className="col-xs-12">
                            <DashboardTabDisplay 
                                app={this.app}
                                socket={this.state.admin_socket}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };
};


// Run the application
ReactDOM.render(
  <Application />,
  document.getElementById('main')
);


