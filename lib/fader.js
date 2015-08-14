
function Fader(first, second) {
    // TODO assert first and second are Elements
    this._first =  first;
    this._second = second;

    [this._first, this._second].forEach(function (el, i) {
        // TODO check if opacity in "01"?
        if (!el.style.opacity)
            throw new Error("`opacity` must be explicitely set: " + el);
    });

    this._tweens = false; // TODO ensure with getComputedStyle?
    this._data = null;
    this._rendered = [null, null, null];

    var listener = this.__ontransitionend.bind(this);
    ['transitionend', 'oTransitionend', 'webkitTransitionend'
    ].forEach(function (name) {
        this._first.addEventListener(name, listener, false);
    }, this);
}

Fader.prototype = {
    constructor: Fader,

    into: function (data) {
        this._data = data;
        if (this._rendered[1] === data)
            this._state = 1;
        else if (this._rendered[2] === data)
            this._state = 2;
        else if (!this._tweens)
            this.__render();
        // else wait for `transitionend`
    },
 
    render: function (data, el) {
        if (typeof data === 'function') data(el);
        else throw new Error("render method missing");
    },

    /*
    0 off, off
    1 off, on
    2 on,  off
    */
    get _state() {
        if (this._first.style.opacity === "1") return 1;
        if (this._second.style.opacity === "1") return 2;
        return 0;
    },
    set _state(state) {
        var current = this._state;
        if (current !== state) {
            this._first.style.opacity = state & 1 ? 1 : 0;
            this._second.style.opacity = state & 2 ? 1 : 0;
            this._tweens = true;
        }
    },

    get _hidden() {
        return this._state === 1 ? this._second : this._first;
    },

    __ontransitionend: function (evt) {
        if (evt.target === this._first &&
            evt.propertyName === 'opacity') {
            this._tweens = false;
            var state = this._state;

            if (state === 0)
                return; // hide
            if (this._rendered[state] === this._data)
                return; // shown already

            this.__render(state);
        }
    },

    __render: function (state) {
        if (state === undefined) state = this._state;
        // render data in hidden element
        this.render(this._data, state === 1 ? this._second : this._first);
        // show hidden element & remember what's in it
        this._rendered[this._state = state === 1 ? 2 : 1] = this._data;
    },

    out: function () {this._state = 0;},

    toString: function () {return "[object Fader]";}
};


/**
 * @param {Element} el
 * @param {Object|String|Integer} _ conf, cls or duration
 * @param {String|Integer} _ cls or duration
 */
function ImageFader(el/*, ...*/) {
    // parse arguments

    var cls, duration;
    if (typeof arguments[1] === 'object') {
        // if first arg is an object, treat it as configuration
        var conf = arguments[1];
        cls = conf.cls;
        duration = conf.duration;
    }
    else {
        // if arguments 'looks like' a number, take it for duration,
        // otherwise, take it for a CSS class of fader pane
        (function parse(arg) {
            if (!isNaN(arg)) duration = arg;
            else if (typeof arg === 'string') cls = arg;
            return parse;
        })(arguments[1])(arguments[2]);
    }

    Fader.apply(this, [cls, cls].map(function (cls, i) {
        return el.appendChild(this.pane(cls, i));
    }, this));

    if (duration) {
        var rule = 'opacity ' + duration + 's';
        ['transition', 'oTransition', 'webkitTransition'
        ].forEach(function (n) {
            this._first.style[n] = this._second.style[n] = rule;
        },this);
    }
    else {
        // TODO check computed style, and iff transition's not set
        // give a warning/error
        console.warn('Duration not set: assuming `transition: opacity` ' +
                     'is set elsewhere (e.g. in .css)');
    }
    this._img = null;
}

ImageFader.prototype = Object.create(Fader.prototype, {
    render: {
        value: function render(src, el) {
            el.style.backgroundImage = 'url("' + src + '")';
        },
        writable: true
    },

    /**
     * Build fader pane
     * @param {String} cls CSS class provided to constructor
     * @param {Integer} i Pane's index (0 or 1)
     * @return {Element}
     */
    pane: {
        value: function pane(cls, i) {
            var el = document.createElement('div');
            el.className = cls || 'fader-pane';
            el.style.opacity = "0";
            return el;
        },
        writable: true
    },
    src: {
        set: function (src) {
            if (!src) {
                // release data
                this._img = null;
                this.out();
            }
            else {
                if (!this._img) {
                    this._img = new Image();
                    this._img.onload = (function (evt) {
                        this.into(this._img.src);
                    }).bind(this);
                    this._img.onerror = function (evt) {
                        console.warn("img load error: " + evt.target.src);
                    };
                }
                this._img.src = src; 
            }
        }
    }
});
