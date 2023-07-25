dungeonjs = {
    touch : {
        start : {
            x: 0,
            y: 0,
            time : 0,
        },
        end : {
            x: 0,
            y: 0,
        },
        
        threshold : {
            x: 20,
            y: 20,
            time: 200,
        },
    },
    grid : {
        x: 0,
        y: 0,
    },
    meta_backup : '',
    dungeon : null,
    images : [],
    // Dual support
    images_back : [],
    is_back : false,
    flip_on_rotate : false,
    figures : [],
    binds : {},
    loaded : false,
    measure : false,
    is_dual : false,
    watermark : null,
    measure_pos : {},
    has_last_measure : false,
    last_measure_pos : {},
    floater: null,
    floater_offset : {
        x: 0,
        y: 0,
    },
    global_bind : function(event, func, options) {
        if(this.binds[event]) {
            throw `Event ${event} already registered`;
        }
        this.binds[event] = func.bind(this);
        window.addEventListener(event, this.binds[event], options);
    },
    global_unbind : function(event, options) {
        if(!this.binds[event]) {
            throw `Event ${event} not registered`;
        }
        window.removeEventListener(event, this.binds[event], options);
        this.binds[event] = undefined;
    },
    get_image : function(x, y) {
        if(x < 0 || x >= this.grid.x || y < 0 || y >= this.grid.y) {
            return [null, null];
        }
        if(this.is_back) {
            return [this.images_back[y][x], this.figures[y][x]];
        }
        return [this.images[y][x], this.figures[y][x]];
    },
    init : function(id) {
        const me = this;
        
        if(this.dungeon) {
            throw "We already have one open";
        };
        document.querySelectorAll(".dungeon-js").forEach(function(element) {
            if(element.dataset.id == id)
            {
                me.load(element);
            }
        });
    },
    in_viewport : function(entries, observer)  {
        entries.forEach(entry => {
            entry.target.classList.toggle("in-viewport", entry.isIntersecting);
        });
    },

    continue_loading : function(meta, meta_back) {
        console.log(meta);
        const me = this;
        if(meta.version != 1.0) {
            throw 'Invalid metadata version';
        }
        this.observer = new IntersectionObserver(this.in_viewport);
        this.observer_options = {}; 
        this.grid.x = meta.grid.x;
        this.grid.y = meta.grid.y;
        
        
        const inner = document.createElement("div");
        inner.classList.add("djs-inner", "djs-visible");
        
        for(var y = 0; y < meta.grid.y; y++) {
            const row = document.createElement("div");
            this.images[y] = [];
            if(this.is_dual)
                this.images_back[y] = [];
            this.figures[y] = [];
            row.classList.add("djs-row", "djs-visible");
            inner.appendChild(row);
            for(var x = 0; x < meta.grid.x; x++) {

                function createImage(meta, x, y) {
                    const img = document.createElement('img');
                    // Get the image name
                    img_name = String(y).padStart(3, '0') + String(x).padStart(3, '0');
                    img.dataset.src = `${meta.image.base_url}${img_name}.${meta.image.extension}`;
                    img.crossOrigin="anonymous";
                    //img.src = `${meta.image.base_url}000000.${meta.image.extension}`;

                    img.alt = img_name;
                    
                    img.classList.add("djs-image", "djs-visible");
                    return img;
                }

                const img = createImage(meta, x, y);
                img.classList.add("is-loading", "djs-front-image");
                var img_back = null;
                if(this.is_dual) {
                    img_back = createImage(meta_back, x, y);
                    img_back.classList.add("djs-back-image", "is-loading");
                }

                
                
                
                const figure = document.createElement("div");
                
                figure.classList.add("djs-figure", "djs-visible");
                
                figure.dataset.x = x;
                figure.dataset.y = y;
                if(meta.aspect_ratio.fixed) {
                    figure.style.aspectRatio = meta.aspect_ratio.width / meta.aspect_ratio.height;
                    img.style.aspectRatio = meta.aspect_ratio.width / meta.aspect_ratio.height;
                    figure.style.width = meta.aspect_ratio.width + "px";
                    if(img_back) {
                        img_back.style.aspectRatio = meta.aspect_ratio.width / meta.aspect_ratio.height;              
                    }
                }
                figure.appendChild(img);
                if(img_back) {
                    figure.appendChild(img_back);
                }
                if(x == this.dungeon.dataset.x && y == this.dungeon.dataset.y) {
                    figure.classList.add("is-selected");
                    img.src = `${meta.image.base_url}${img.alt}.${meta.image.extension}`;
                    if(img_back) {
                        img_back.src = `${meta_back.image.base_url}${img_back.alt}.${meta_back.image.extension}`;
                    }
                    // Update layout on loading finished
                    img.addEventListener("load", function() {
                        me.finish_initializing();
                    });
                }
                this.images[y].push(img);
                if(this.is_dual) {
                    this.images_back[y].push(img_back);
                }

                
 
                this.observer.observe(figure, this.observer_options);
                this.figures[y].push(figure);
                row.appendChild(figure);
                figure.addEventListener("click", function(e) {
                    me.on_click(figure, e);
                });
                figure.addEventListener("mousemove", function(e) {
                    me.on_hover_mousemove(figure, e);
                });
                figure.addEventListener("touchmove", function(e) {
                    me.on_hover_touchmove(figure, e);
                }, {passive : false});
                figure.addEventListener("mouseleave", function(e) {
                    me.on_leave(figure, e);
                });
                figure.addEventListener("touchend", function(e) {
                    me.on_leave(figure, e);
                }, {passive : false});
                
                //console.log(`image ${img_name} created`);
            }
        }
        
        
        
        
        
        this.dungeon.appendChild(inner);
        //console.log("inner added to DOM");
        // Create controls
        ["left", "right", "up", "down"].forEach(function(direction) {
            const btn = document.createElement("a");
            btn.classList.add("button", "djs-control", `is-${direction}`, 'is-link', "djs-visible");
            btn.addEventListener("click", function(e) {
                switch (direction) {
                    case "left":
                    me.move(-1, 0);
                    break;
                    case "right":
                    me.move(1, 0);
                    break;
                    case "up":
                    me.move(0, -1);
                    break;
                    case "down":
                    me.move(0, 1);
                    break;
                }
            })
            btn.innerHTML = `<span class='icon djs-visible'><i class='fas fa-arrow-${direction} djs-visible'></i></span>`;
            me.dungeon.appendChild(btn);
        })
        // Create hover control
        const floater = document.createElement("div");
        floater.classList.add("djs-floater", "djs-visible");
        this.floater = floater;
        this.dungeon.appendChild(floater);
        // Create measure market
        const marker = document.createElement("div");
        marker.classList.add("djs-marker", "djs-visible");
        this.marker = marker;
        this.dungeon.appendChild(marker);
        // Create close button
        const closeBtn = document.createElement("a");
        closeBtn.classList.add("button", "djs-control", 'is-primary', "is-rounded", 'is-close', "djs-visible");
        closeBtn.addEventListener("click", this.unload.bind(this));
        closeBtn.innerHTML = "<span class='icon djs-visible'><i class='fas fa-times djs-visible'></i></span>";
        this.dungeon.appendChild(closeBtn);
        // Create rotate button
        if(this.is_dual) {
            const rotateBtn = document.createElement("a");
            rotateBtn.classList.add("button", "djs-control", "is-rounded", 'is-rotate', "djs-visible");
            rotateBtn.addEventListener("click", this.rotate.bind(this));
            rotateBtn.innerHTML = "<span class='icon djs-visible'><i class='fa fa-redo djs-visible'></i></span>";
            this.dungeon.appendChild(rotateBtn);          
        }
        const screenshotBtn = document.createElement("a");
        screenshotBtn.classList.add("button", "djs-control", "is-rounded", "is-screenshot", "djs-visible");
        screenshotBtn.addEventListener("click", this.screenshot.bind(this));
        screenshotBtn.innerHTML = "<span class='icon djs-visible'><i class='fa fa-camera djs-visible'></i></span>";
        this.dungeon.appendChild(screenshotBtn);        
        
        // Create watermark
        this.watermark = document.createElement("img");
        this.watermark.crossOrigin="anonymous";
        this.watermark.classList.add("djs-watermark", "djs-visible");
        this.watermark.src = "/img/logo_white.svg";
        this.dungeon.appendChild(this.watermark);

        // Create badge
        /*
            <a data-id="advanced_front" class="button is-info is-rounded pulse_button dungeon-js-open" id="advanced-view" data-tooltip="<?= lang('global.case_swipe.advanced_view.description') ?>">
                <?= c2g_icon("logo", "mr-2") ?>
                <span>
                    <span class="is-teko-specialty">Premium</span> Zoom
                </span>
            </a>

        */
       const badge = document.createElement("span");
       badge.innerHTML = `
            <span class='icon mr-2 djs-visible'><i class='c2g_icon-logo djs-visible'></i></span>
            <span class="djs-visible">
                <span class="is-teko-specialty djs-visible">Premium</span> Zoom
            </span>
       `;
       badge.classList.add("djs-badge", "djs-visible", "button");
       this.dungeon.appendChild(badge);
        
        //window.setTimeout(function() { me.finish_initializing(); }, 100);         
    },
    load : function(dungeon) {
        const me = this;
        const meta_url = dungeon.dataset.url;
        this.dungeon = dungeon;
        this.setup_page();
        this.measure = dungeon.dataset.measure == "true";
        this.is_dual = dungeon.dataset.dual == "true";
        const meta_url_back = (this.is_dual) ? dungeon.dataset.url_back : "";
        if(!("x" in dungeon.dataset)){
            dungeon.dataset.x = 0;
            dungeon.dataset.y = 0;
        }
        if(!("is_back" in dungeon.dataset)) {
            dungeon.dataset.is_back = false;
        }      
        fetch(meta_url)
        .then((response) => response.json())
        .then((meta) => {
            if(this.is_dual) {
                fetch(meta_url_back)
                .then((response) => response.json())
                .then((meta_back) => {
                    this.continue_loading(meta, meta_back);
                });
            } else {
                this.continue_loading(meta, null);
            }
        });
    },
    screenshot : function() {
        // Fetch current image
        const x = parseInt(this.dungeon.dataset.x);
        const y = parseInt(this.dungeon.dataset.y);
        [image, figure] = this.get_image(x, y);
        // No screenshot for loading images
        if(image.classList.contains("is-loading")) {
            return;
        }
        // Create canvas
        var Canvas = null;
        Canvas = document.createElement("canvas");
        Canvas.width = image.naturalWidth;
        Canvas.height = image.naturalHeight;
        var ctx = Canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        
        ctx.globalAlpha = 0.4;

        const ratio = 200 / this.watermark.naturalWidth;
        const height = this.watermark.naturalHeight * ratio;

        ctx.drawImage(this.watermark, 
            Canvas.width / 2 - 100,
            Canvas.height / 2 - (height / 2),
            200, height);


        Canvas.toBlob(function(blob){
            saveAs(blob, `${document.title}.jpg`);
            viewer.element.style.height = originalCSy + "px";
            viewer.element.style.width = originalCSx + "px";
        }, "image/jpeg", 0.80);
    },
    rotate : function() {
        if(!this.dungeon) {
            throw "No active dungeon";
        }
        if(!this.is_dual) {
            throw "Can't rotate a single dungeon";
        }
        this.dungeon.classList.toggle("is-back");
        this.is_back = (this.dungeon.classList.contains("is-back"));
        /*this.images.forEach(function(row) {
            row.forEach(function(image) {
                image.classList.add("is-loading");
            });
        });*/
        if(this.flip_on_rotate) {
            const x = this.grid.x - parseInt(this.dungeon.dataset.x) - 1;
            const y = parseInt(this.dungeon.dataset.y);
            this.move_abs(x, y);
        }
        this.update();
    },
    unload : function() {
        if(!this.dungeon) {
            throw "No active dungeon";
        }
        this.observer.disconnect();
        this.observer = null;
        this.restore_page();
        this.loaded = false;
        this.measure = false;
        this.dungeon.innerHTML = "";
        this.images = [];
        this.images_back = [];
        this.figures = [];
        this.floater = null;
        this.dungeon = null;

        
    },
    
    setup_page : function() {
        if(!this.dungeon) {
            throw "Unable to find dungeon";
        }
        
        
        this.disable_zoom();
        document.body.classList.add("is-dungeon-js");
        
        this.dungeon.id = "dungeon-js";
        this.dungeon.classList.add("is-loading", "djs-visible");
        this.dungeon.style.width = document.documentElement.clientWidth;
        this.dungeon.style.height = document.documentElement.clientHeight;
        
        spinner = document.createElement("div");
        spinner.classList.add("djs-spinner", "djs-visible");
        this.dungeon.appendChild(spinner);
        
        this.global_bind('resize', this.on_resize);
        this.global_bind('keydown', this.on_keydown);
        this.global_bind('touchstart', this.on_touchstart, {passive: false});
        this.global_bind('touchmove', this.on_touchmove, {passive: false});
        this.global_bind('touchend', this.on_touchend, {passive: false});
        this.global_bind('wheel', this.on_wheel);
        window.scrollTo(0,0); 
        
    },
    restore_page : function() {
        document.body.classList.remove("is-dungeon-js");
        
        this.dungeon.id = "";
        this.dungeon.style.width = 0;
        this.dungeon.style.height = 0;
        
        
        this.global_unbind('resize', this.on_resize);
        this.global_unbind('keydown', this.on_keydown);
        this.global_unbind('touchstart', {passive: false});
        this.global_unbind('touchmove', {passive: false});
        this.global_unbind('touchend', {passive: false}); 
        this.global_unbind('wheel', {passive: false}); 
        
        this.restore_zoom();
    },
    disable_zoom : function() {
        var metaViewport = document.querySelector('meta[name=viewport]');
        if(!metaViewport) {
            metaViewport = document.createElement("meta");
            metaViewport.name = "viewport";
            document.head.appendChild(metaViewport);
        }
        this.meta_backup = metaViewport.getAttribute('content');
        appliedScale = 1 - Math.random()*0.01;
        metaViewport.setAttribute('content',  `width=device-width, initial-scale=${appliedScale}, user-scalable=no`);
    },
    restore_zoom : function() {
        const metaViewport = document.querySelector('meta[name=viewport]');
        metaViewport.setAttribute('content', this.meta_backup);;
    },
    finish_initializing : function() {
        const me = this;
        if(this.dungeon) {
            this.dungeon.classList.remove("is-loading");
            // Push the first update
            this.loaded = true;
            me.update();
        }
    },
    loadahead: function() {
        if(this.dungeon && this.loaded) {
            // Fetch current selection
            const x = parseInt(this.dungeon.dataset.x);
            const y = parseInt(this.dungeon.dataset.y);
            var la_x;
            var la_y;
            // Loadahead
            for(var off_y = -3; off_y < 3; off_y++) {
                for(var off_x = -2; off_x < 2; off_x++) {
                    la_x = x + off_x;
                    la_y = y + off_y;
                    const [image, figure] = this.get_image(la_x, la_y);
                    if(figure) {
                        if(image.dataset.src != image.src) {
                            image.src = image.dataset.src;
                            image.addEventListener("load", function(e) {
                                e.target.classList.remove("is-loading");
                            })
                        } else {
                            //image.classList.remove("is-loading");
                        }
                    }
                }
            }
        }
    },
    update : function() {
        const me = this;
        if(!this.dungeon) {
            throw "dungeonjs.update called with no open dungeon";
        }
        if(!this.loaded) { return; }// Wait
        
        // Fetch current selection
        var x = parseInt(this.dungeon.dataset.x);
        var y = parseInt(this.dungeon.dataset.y);
        while(x < 0) {
            x++;
        }
        while(y < 0) {
            y++;
        }
        while(x >= this.grid.x) {
            x--;
        }
        while(y >= this.grid.y) {
            y--;
        }
        //console.log(`Updating at ${x} ${y}`);
        this.dungeon.dataset.x = x;
        this.dungeon.dataset.y = y;
        const viewWidth = document.documentElement.clientWidth;
        const viewHeight = document.documentElement.clientHeight;
        this.dungeon.style.width = viewWidth + "px";
        this.dungeon.style.height = viewHeight + "px";
        // Get current actual size of an image
        [image, figure] = this.get_image(0, 0);
        if(!figure){
            throw "dungeonjs open but no images are present";
        }
        
        const imageWidth = figure.offsetWidth;
        const imageHeight = figure.offsetHeight;
        
        
        
        inner = this.dungeon.querySelector(".djs-inner");

        // Transform for selecting
        const baseOffsetX = viewWidth / 2 - imageWidth / 2;
        const baseOffsetY = viewHeight / 2 - imageHeight / 2;
        const offsetX = baseOffsetX  - (imageWidth * x);
        const offsetY = baseOffsetY - (imageHeight * y);
        //console.log("-----");
        //console.log(baseOffsetX, baseOffsetY);
        //console.log(viewWidth, viewHeight);
        //console.log(imageWidth, imageHeight);
        //console.log(x, y);
        //console.log(offsetX, offsetY);
        inner.style.transform = `translate(${offsetX}px, ${offsetY}px)`;   
        //inner.style.setProperty("transform-origin", "top left");
       
        // Update selected status
        const oldFigure = this.dungeon.querySelector(".djs-figure.is-selected");
        const oldImage = oldFigure.querySelector(".djs.image");
        [newImage, newFigure] = this.get_image(x, y);
        if(newImage) {
            if(oldFigure) {
                oldFigure.classList.remove("is-selected");
                oldFigure.style.transform = ""; 
            }
            newFigure.classList.add("is-selected");
            
            
            
            // Load
            if(newImage.classList.contains("is-loading")) {
                newImage.src = newImage.dataset.src;
                newImage.addEventListener("load", function(e) {
                    e.target.classList.remove("is-loading");
                })
            }            
            // Floater update
            if(this.floater) {
                this.floater.style.setProperty("background-image", `url(${newImage.dataset.src})`);
                
            }
        }
        
        this.loadahead();
        if(this.measure) {
            this.refresh_marker();
        }
        
    },
    on_hover_mousemove : function(el, e) {
        
        this.on_hover(e.clientX, e.clientY, false, el);
        
    },
    on_hover_touchmove : function(el, e) {
        const time_delta = new Date() - this.touch.start.time;
        if(time_delta > this.touch.threshold.time) {
            this.on_hover(e.touches[0].clientX, e.touches[0].clientY, true, el);
        }
        e.preventDefault();
    },
    refresh_marker : function() {
        if(!this.measure) {
            return;
        }
        
        // Get current image 
        const x = parseInt(this.dungeon.dataset.x);
        const y = parseInt(this.dungeon.dataset.y);
        [image, figure] = this.get_image(x, y);
        const rect = figure.getBoundingClientRect();
        // Get real image size
        const imageWidth = image.naturalWidth;
        const imageHeight = image.naturalHeight;
        // Calculate ratio
        const ratioX = imageWidth / figure.offsetWidth ;
        const ratioY = imageHeight / figure.offsetHeight;
        const localX = this.last_measure_pos['x'] / ratioX;
        const localY = this.last_measure_pos['y'] / ratioY;
        const globalX = localX + rect.left;
        const globalY = localY + rect.top;
        
        this.marker.style.setProperty ("--left",  globalX + "px");
        this.marker.style.setProperty ("--top", globalY + "px");
    },
    reset_measure : function() {
        this.measure_pos = {};
        this.last_measure_pos = {};
        this.has_last_measure = false;
        this.refresh_marker();
    },
    on_hover : function(globalX, globalY, is_touch, el) {
        // Prevent event on uninitialized library
        if(!this.dungeon || !this.floater){
            return;
        }
        // Get current image 
        const x = parseInt(this.dungeon.dataset.x);
        const y = parseInt(this.dungeon.dataset.y);
        [image, figure] = this.get_image(x, y);
        // Only on a selected and loaded image
        if(!el.classList.contains("is-selected") || image.classList.contains("is-loading")) {
            return;
        }

        // Get real image size
        const imageWidth = image.naturalWidth;
        const imageHeight = image.naturalHeight;
        // Calculate ratio to current width
        const ratioX = imageWidth / el.offsetWidth ;
        const ratioY = imageHeight / el.offsetHeight;
        // Get local coordinate
        const rect = el.getBoundingClientRect();
        const localX = globalX - rect.left;
        const localY = globalY - rect.top;
        const THRESHOLD = 5;
        const horizontal = (globalX - rect.left) / el.clientWidth;
        const vertical = (globalY - rect.top) / el.clientHeight;
        const rotateX = (THRESHOLD / 2 - horizontal * THRESHOLD).toFixed(2);
        const rotateY = (vertical * THRESHOLD - THRESHOLD / 2).toFixed(2);
        if(!this.measure)
            figure.style.transform = `perspective(${el.clientWidth}px) rotateX(${rotateY}deg) rotateY(${rotateX}deg) scale3d(1, 1, 1)`; 
        // If the ratio is close enough to 1:1 just ignore it
        if(ratioX <= 1.05 && ratioY <= 1.05 && !this.measure) { return ; }
        

        // Hide the cursor
        figure.style.cursor = 'none';

           
        // Get floater total size for calculating the display area
        const floaterWidth = this.floater.offsetWidth;
        const floaterHeight = this.floater.offsetHeight;
        var floaterLeft = globalX - (floaterWidth/2);
        var floaterTop = globalY - (floaterHeight/2);
        
        
        
        // Detect touch
        if(is_touch) {
            this.floater.classList.add("is-touch");
        } else {
            this.floater.classList.remove("is-touch");
        }
        // Show floater
        if(this.floater.style.visibility != 'visible') {
            this.floater.style.visibility = 'visible';
        }
        // On mouse the floater follows the mouse
        if(!is_touch) {
            this.floater.style.setProperty ("--left",  floaterLeft + "px");
            this.floater.style.setProperty ("--top", floaterTop + "px");
        }
        // Calculate background offset
        var positionX = Math.floor((imageWidth -  (localX * ratioX)));
        var positionY = Math.floor((imageHeight - (localY * ratioY)));
        if(this.measure) {
            this.floater.classList.add("is-measure");

            const measureX = localX * ratioX;
            const measureY = localY * ratioY;
            this.measure_pos = {
                'x' : measureX,
                'y' : measureY,
            };
            if(this.has_last_measure) {
                deltaX = Math.round(Math.abs(measureX - this.last_measure_pos["x"]));
                deltaY = Math.round(Math.abs(measureY - this.last_measure_pos["y"]));
                this.floater.innerHTML = `<p class="measure djs-visible">X : ${deltaX}<br class="djs-visible">Y: ${deltaY}</p>`;
            } else {
                this.floater.innerHTML = "";
            }
            
        } else {
            this.floater.classList.remove("is-measure");
        }
        
        // Prevent going too much out of bounds
        if(positionX < 0) positionX = 0;
        if(positionX > imageWidth) positionX = imageWidth;
        if(positionY < 0) positionY = 0;
        if(positionY > imageHeight) positionY = imageHeight;
        // Consider the floater size
        positionX -= floaterWidth/2;
        positionY -= floaterHeight/2;
        // Move the image accordingly
        this.floater.style.setProperty("background-position", `right ${-positionX}px bottom ${-positionY}px`);
    },
    on_leave : function(el, e) {
        if(!this.dungeon || !this.floater){
            return;
        }
        if(!el.classList.contains("is-selected")) {
            return;
        }
        this.floater.style.visibility = 'hidden';
        console.log("test");
        el.style.cursor = 'pointer';
        el.style.transform = ""; 
    },
    move_abs : function(x, y) {
        if(!this.dungeon) { 
            return false;
        }
        this.reset_measure();
        
        if(x == this.dungeon.dataset.x && y == this.dungeon.dataset.y) {
            return false;
        }
        this.dungeon.dataset.x = x;
        this.dungeon.dataset.y = y;
        this.update(this.dungeon);
        return true;
    },
    move : function(offset_x, offset_y) {
        if(offset_x != 0 || offset_y != 0) {
            const x = parseInt(this.dungeon.dataset.x) + offset_x;
            const y = parseInt(this.dungeon.dataset.y) + offset_y;
            return this.move_abs(x, y);
        }
        return false;
    },
    on_resize : function() {
        window.setTimeout(this.update(), 300);
    },
    on_keydown : function(event) {
        var offset_x = 0;
        var offset_y = 0;
        switch(event.keyCode) {
            // Left
            case 37:
            case 65:
                offset_x = -1;
                break;
            // Up
            case 38:
            case 87:
                offset_y = -1;
                break;
            // Right
            case 39:
            case 68:
                offset_x = 1;
                break;
            // Down
            case 40:
            case 83:
                offset_y = 1;
                break;
            case 27:
                return this.unload();
        }
        this.move(offset_x, offset_y);
    },
    on_click : function(el, e) {
        if(!this.dungeon){
            return;
        }
        
        if(el.classList.contains("is-selected")) {
            if(this.measure) {
                this.last_measure_pos = this.measure_pos;
                this.has_last_measure = true;
                this.refresh_marker();
            }
            e.preventDefault();
            
            
        } else {
            this.move_abs(el.dataset.x, el.dataset.y)
        }
    },
    on_touchstart: function(event) {
        this.touch.start.x = event.touches[0].clientX;
        this.touch.start.y = event.touches[0].clientY;
        this.touch.start.time = new Date();
    },
    on_touchmove: function(event) {
        if(!event.target.classList.contains("is-selected")) {
            event.preventDefault();
        }
    },
    on_touchend: function(event) {
        this.touch.end.x = event.changedTouches[0].clientX;
        this.touch.end.y = event.changedTouches[0].clientY;
        
        const time_delta = new Date() - this.touch.start.time;
        
        
        if(time_delta > this.touch.threshold.time)
        return;
        
        
        
        const dist = {
            x : this.touch.end.x - this.touch.start.x,
            y : this.touch.end.y - this.touch.start.y
        };
        
        const abs_dist = {
            x : Math.abs(dist.x),
            y : Math.abs(dist.y),
        };
        
        
        
        // Check if we have enough movement 
        if(abs_dist.x < this.touch.threshold.x) {
            abs_dist.x = 0;
        }
        if(abs_dist.y < this.touch.threshold.y) {
            abs_dist.y = 0;
        }
        
        if(abs_dist.x == 0 && abs_dist.y == 0)
        return;
        // Check which one has more movement (ratio)
        const dist_ratio = {
            x : abs_dist.x / this.touch.threshold.x,
            y : abs_dist.y / this.touch.threshold.y
        };
        
        var offset_x = 0;
        var offset_y = 0;
        
        if(dist_ratio.x > dist_ratio.y) {
            if(dist.x >= this.touch.threshold.x) {
                offset_x = -1;
            } else if(dist.x <= -this.touch.threshold.x) {
                offset_x = 1;
            }
        } else {
            if(dist.y >= this.touch.threshold.y) {
                offset_y = -1;
                event.preventDefault();
            } else if(dist.y <= -this.touch.threshold.y) {
                offset_y = 1;
            }    
        }
        
        this.move(offset_x, offset_y);
    },
    on_wheel : function(e) {
        var offset_x = 0;
        var offset_y = 0;
        var deltaX = e.deltaX;
        var deltaY = e.deltaY;
        if(e.shiftKey) {
            console.log("shift");
            var bkp = deltaX;
            deltaX = deltaY;
            deltaY = bkp;
        }
        console.log(e);
        if(deltaX > 0) {
            offset_x = 1;
        } else if(deltaX < 0) {
            offset_x = -1;
        } else if(deltaY > 0) {
            offset_y = 1;
        } else if(deltaY < 0) {
            offset_y = -1;
        }
        this.move(offset_x, offset_y);
        e.preventDefault();
    }
}
document.addEventListener('DOMContentLoaded', function(e) {
    var attempts = 10;
    const searchInterval = setInterval(() => {
        //console.log("Attempts " + attempts)
        if(attempts-- <= 0) { 
            clearInterval(searchInterval);
            return;
        }
        document.querySelectorAll(".dungeon-js-open").forEach(function(opener) {
            opener.addEventListener("click", function(e) {
                //console.log(opener.dataset.id);
                dungeonjs.init(opener.dataset.id);
                
            });
            clearInterval(searchInterval);
        });
        
    }, 100);
    
});