import fs from "fs";
import http from "http";
import https from "https";

export default class SparkPlatform {
    
    init(stage) {
        this.stage = stage;
        this._looping = false;
        this._awaitingLoop = false;
    }

    destroy() {
    }

    startLoop() {
        this._looping = true;
        if (!this._awaitingLoop) {
            this.loop();
        }
    }

    stopLoop() {
        this._looping = false;
    }

    loop() {
        let self = this;
        let lp = function() {
            self._awaitingLoop = false;
            if (self._looping) {
                self.stage.drawFrame();
                if (self.changes) {
                    // We depend on blit to limit to 60fps.
                    setImmediate(lp);
                } else {
                    setTimeout(lp, 16);
                }
                self._awaitingLoop = true;
            }
        }
        setTimeout(lp, 16);
    }

    uploadGlTexture(gl, textureSource, source, options) {
        gl.texImage2D(gl.TEXTURE_2D, 0, options.internalFormat, textureSource.w, textureSource.h, 0, options.format, options.type, source);
    }

    loadSrcTexture({src}, cb) {
        let sparkImage = sparkscene.create({t:"image", flip:true, url:src});
        const sparkGl = this.stage.gl;
        sparkImage.ready.then( function(obj) {
            let texture = sparkImage.texture();
            cb(null, {source: sparkGl.createWebGLTexture(texture), w: sparkImage.resource.w, h: sparkImage.resource.h, premultiplyAlpha: false, flipBlueRed: false, imageRef: sparkImage});
        });
    }

    createRoundRect(cb, stage, w, h, radius, strokeWidth, strokeColor, fill, fillColor) {
        if (fill === undefined) fill = true;
        if (strokeWidth === undefined) strokeWidth = 0;

        fillColor = fill ? fillColor : 0;
        fillColor = fillColor.toString(16);
        let opacity = 1;
        if (fillColor.length >= 8)
        {
            let alpha = fillColor.substring(0,2);
            let red = fillColor.substring(2,4);
            let green = fillColor.substring(4,6);
            let blue = fillColor.substring(6);
            fillColor = "#" + red + green + blue;
            opacity = "0x"+alpha;
            opacity = parseInt(opacity, 16) / 255;
        }
        let boundW = w;
        let boundH = h;
        let data = "data:image/svg,"+'<svg viewBox="0 0 '+boundW+' '+boundH+'" xmlns="http://www.w3.org/2000/svg"><rect width="'+w+'" height="'+h+'" fill="'+fillColor+'" fill-opacity="'+opacity+'" rx="'+radius+'" stroke="'+strokeColor+'" stroke-width="'+strokeWidth+'"/></svg>';
    
        let imageObj = sparkscene.create({ t: "image", flip:true, url:data});
        imageObj.ready.then( function(obj) {
            let canvas = {};
            canvas.internal = imageObj;
            canvas.width = w;
            canvas.height = h;
            imageObj.w = w;
            imageObj.h = h;
            cb(null, canvas);
        });
    }

    createShadowRect(cb, stage, w, h, radius, blur, margin) {
        let boundW = w + margin * 2;
        let boundH = h + margin * 2;
        let data = "data:image/svg,"+
            '<svg viewBox="0 0 '+boundW+' '+boundH+'" xmlns="http://www.w3.org/2000/svg" version="1.1"> \
                    <linearGradient id="rectGradient" gradientUnits="userSpaceOnUse" x1="0%" y1="180%" x2="100%" y2="-60%" gradientTransform="rotate(0)"> \
                    <stop offset="20%" stop-color="#00FF00" stop-opacity="0.5"/> \
                    <stop offset="50%" stop-color="#0000FF" stop-opacity=".8"/> \
                    <stop offset="80%" stop-color="#00FF00" stop-opacity=".5"/> \
                    </linearGradient> \
                    <filter id="rectBlur" x="0" y="0"> \
                    <feGaussianBlur in="SourceGraphic" stdDeviation="'+blur+'" /> \
                    </filter> \
                </defs> \
                <g enable-background="new" > \
                    <rect x="0" y="0" width="'+boundW+'" height="'+boundH+'" fill="url(#rectGradient)"  rx="'+radius+'" stroke-width="'+margin+'" filter="url(#rectBlur)"/> \
                </g> \
                </svg>';
    
        let imageObj = sparkscene.create({ t: "image", flip:true, url:data});
        imageObj.ready.then( function(obj) {
            let canvas = {};
            canvas.internal = imageObj;
            canvas.width = w;
            canvas.height = h;
            imageObj.w = w;
            imageObj.h = h;
            cb(null, canvas);
        });
    }

    createSvg(cb, stage, url, w, h) {
        let imageObj = sparkscene.create({ t: "image", flip:true, url:url});
        imageObj.ready.then( function(obj) {
            let canvas = {};
            canvas.internal = imageObj;
            canvas.width = w;
            canvas.height = h;
            imageObj.w = w;
            imageObj.h = h;
            cb(null, canvas);
        }, function(obj) {
            let canvas = {};
            canvas.internal = imageObj;
            cb(null, canvas);;
        });
    }

    createWebGLContext(w, h) {
        let options = {width: w, height: h, title: "WebGL"};
        const windowOptions = this.stage.getOption('window');
        if (windowOptions) {
            options = Object.assign(options, windowOptions);
        }
        let gl = sparkgles2.init(options);
        return gl;
    }

    getWebGLCanvas() {
        return;
    }

    getTextureOptionsForDrawingCanvas(canvas) {
        let options = {};

        if (canvas && canvas.internal)
        {
            options.source = this.stage.gl.createWebGLTexture(canvas.internal.texture());
            options.w = canvas.width;
            options.h = canvas.height;
            options.imageRef = canvas.internal;
        }
        options.premultiplyAlpha = false;
        options.flipBlueRed = false;

        return options;
    }

    getHrTime() {
        let hrTime = process.hrtime();
        return 1e3 * hrTime[0] + (hrTime[1] / 1e6);
    }

    getDrawingCanvas() {
        let canvas = {};
        canvas.getContext = function() {};
        return canvas;
    }

    nextFrame(changes) {
        this.changes = changes;
        //gles2.nextFrame(changes);
    }

    registerKeyHandler(keyhandler) {
        console.warn("No support for key handling");
    }

    drawText(textTextureRenderer){
        const precision = textTextureRenderer.getPrecision();
        let highlight = textTextureRenderer._settings.highlight;
        const fontSize = textTextureRenderer._settings.fontSize*textTextureRenderer.getPrecision();
        let highlightColor = 0xFF000000;
        if (highlight)
        {
            highlightColor = textTextureRenderer._settings.highlightColor || 0x00000000;
        }
        let hlHeight = (textTextureRenderer._settings.highlightHeight * precision || fontSize * 1.5);
        let hlOffset = (textTextureRenderer._settings.highlightOffset !== null ? textTextureRenderer._settings.highlightOffset * precision : -0.5 * fontSize);
        const hlPaddingLeft = (textTextureRenderer._settings.highlightPaddingLeft !== null ? textTextureRenderer._settings.highlightPaddingLeft * precision : paddingLeft);
        const hlPaddingRight = (textTextureRenderer._settings.highlightPaddingRight !== null ? textTextureRenderer._settings.highlightPaddingRight * precision : paddingRight);

        let shadowColor = textTextureRenderer._settings.shadowColor;
        let shadowOffsetX = textTextureRenderer._settings.shadowOffsetX * precision;
        let shadowOffsetY = textTextureRenderer._settings.shadowOffsetY * precision;
        let shadowBlur = textTextureRenderer._settings.shadowBlur * precision;
        let textColor = textTextureRenderer._settings.textColor;
        let textColorTemp = textColor.toString(16);
        if (textColorTemp.length >= 8)
        {
            let alpha = textColorTemp.substring(0,2);
            let red = textColorTemp.substring(2,4);
            let green = textColorTemp.substring(4,6);
            let blue = textColorTemp.substring(6);
            textColorTemp = "0x" + red + green + blue + alpha;
            textColor = parseInt(textColorTemp,16);
        }

        highlightColor = "0x" + highlightColor.toString(16);
        shadowColor = "0x" + shadowColor.toString(16);
        let sparkText = sparkscene.create({ t: "text", text:textTextureRenderer._settings.text, pixelSize:fontSize, textColorHint:textColor,
            highlight:highlight, highlightColor:highlightColor , highlightOffset:hlOffset , highlightPaddingLeft:hlPaddingLeft , highlightPaddingRight:hlPaddingRight, highlightHeight:hlHeight,
            shadow: textTextureRenderer._settings.shadow, shadowColor:shadowColor , shadowOffsetX:shadowOffsetX, shadowOffsetY:shadowOffsetY , shadowBlur:shadowBlur});

        return new Promise((resolve, reject) => {
            sparkText.ready.then( function(obj) {
                let renderInfo = {};
                renderInfo.w = sparkText.w;
                renderInfo.h = sparkText.h;
                textTextureRenderer._canvas.width = sparkText.w;
                textTextureRenderer._canvas.height = sparkText.h;
                textTextureRenderer._canvas.internal = sparkText;
                textTextureRenderer.renderInfo = renderInfo;
                resolve();
            });
        });
    }
}

