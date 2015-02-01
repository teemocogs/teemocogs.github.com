$(function() {
 
  var sticky_nav = $('#toc-nav'),
      masthead = $(".masthead");
  var sticky_nav_offset_top = masthead.offset().top + masthead.innerHeight();
   
  var sticky_menu = function(){
    var scroll_top = $(window).scrollTop();
    if (scroll_top > sticky_nav_offset_top) { 
      sticky_nav.addClass("stuck");
    } else {
      sticky_nav.removeClass("stuck"); 
    }
  };
   
  sticky_menu();
   
  $(window).scroll(function() {
    sticky_menu();
  }).resize(function() {
    sticky_nav_offset_top = masthead.offset().top + masthead.innerHeight();
  });


  var toc = $("#toc-nav").toc({
    selectors: "h1,h2",
    'highlightOffset': 0,
    scrollToOffset: 40,
    itemClass: (function() {
      var inSection = false;
      var count = 0;
      return function(i, heading, $heading, prefix) {
          var tag = $heading[0].tagName.toLowerCase();
          if (tag === 'h1') {
            inSection = false;
            return prefix + '-' + tag;
          } else {
            if (!inSection) {
              count = 0;
              inSection = true;
            }
            return prefix + '-' + tag + " section-link-" + (count++);
          }
        }
    })()
  });  

  var SlideMenu = function(container) {
    console.log(container);
    this._container = container;
    this.buildCanvas();
    this._ctx.strokeStyle = '#494949';
    this._ctx.lineWidth = 5;
    this._ctx.save();
    
    this._pos = -100;
    this._len = 100;
    this._target = 0;
    
  }

  SlideMenu.prototype.buildCanvas = function() {
    var self = this;
    var widths = [], offsets = [0];
    var width, left;
    var links = this._container.find("a");
    links.each(function(i, el) {
      var w = $(el).innerWidth(),
          l = $(el).offset().left;
      console.log(el, w, l);
      widths.push(w);
      if (i === 0) width = left = l;
      if (i > 0) offsets[i] = l - width;
      if (i === links.length - 1) width = l + w - width;
      $(el).on("mouseenter", function() {
        var x = offsets[i] + widths[i]/2 - widths[i]*0.4;
        self.slideTo(x, widths[i]*0.8);
      });
    });
    var height = this._container.innerHeight();
    width = this._container.innerWidth()
    this._width = width;
    this._height = height;
    this._widths = widths;
    this._offsets = offsets;
    var canvas = $("<canvas></canvas>")
        .attr("width", width)
        .attr("height", height)
        .css("left", "0");
    this._canvas = canvas;
    this._ctx = canvas[0].getContext("2d");
    this._container.append(canvas);
    var rad = (height - 20)/2;
    var mid,
        bottom = true,
        type = 0, 
        stops = [{
          stop: 0,
          end: widths[0],
          type: -1
        }];
    for (var i = 0; i < offsets.length - 1; i++) {
      mid = (offsets[i+1] + offsets[i] + widths[i])/2;
      stops.push({
        stop: mid - rad,
        end: mid,
        type: type++
        });
      stops.push({
        stop: mid,
        end: mid+rad,
        type: type++
        });
      type = type % 4;
      stops.push({
        stop: mid+rad,
        end: mid+rad+widths[i+1],
        type: bottom ? -2 : -1
      });
      bottom = !bottom;
    }
    this._stops = stops;
    console.log(stops);
    this._rad = rad;
    console.log(widths);
  }

  SlideMenu.prototype.slideTo = function(x, len) {
    var self = this;
    var xlog = [], lenlog = [];
    for (var i = 0; i < 10; i++) {
      xlog.push(this._pos);
      lenlog.push(this._len);
    }
    this._target = x;
    this._lentarget = len;
    if (this._animation) {
      // just updating the targets is enough
    } else {
      var animationLoop = function() {
        var delta = self._target - self._pos;
        if (Math.abs(delta) < 1) {
          self._pos = self._target;
        } else if (Math.abs(0.03 * delta) < 1) {
          self._pos += Math.abs(delta)/delta * 1;
        } else {
          self._pos += 0.03 * delta;
        }
        var lendelta = self._lentarget - self._len;
        if (Math.abs(lendelta) < 2) {
          self._len = self._lentarget;
        } else {
          self._len += Math.abs(lendelta)/lendelta * 1;
        }
        self._clearCanvas();
        self.showLine(self._pos, self._len, false);
        xlog.push(self._pos);
        lenlog.push(self._len);
        var x0 = xlog.shift(),
            len0 = lenlog.shift();
        self.showLine(x0, len0, true);
        if (self._pos === self._target &&
            x0 === self._target) {
          self._animation = null;
          return;
        }
        requestAnimationFrame(animationLoop);
      }
      this._animation = requestAnimationFrame(animationLoop);
    }
  }

  SlideMenu.prototype._clearCanvas = function() {
    this._ctx.clearRect(0, 0, this._width, this._height);
  }

  SlideMenu.prototype._drawSegment = function(isin, bit, xstart, xend) {
    var pi = Math.PI;
    if (bit.type === -2) {
      // bottom
      this._ctx.moveTo(xstart, this._height - 10);
      this._ctx.lineTo(xend, this._height - 10);
    } else if (bit.type === -1) {
      // top
      this._ctx.moveTo(xstart, 10);
      this._ctx.lineTo(xend, 10);
    } else if (bit.type === 0) {
      var start = 1.5*pi, end = 2*pi;
      if (isin === 1) 
        end = start + 0.5*pi*(xend-xstart)/(bit.end-bit.stop);
      if (isin === 2) 
        start = end - 0.5*pi*(xstart-xend)/(bit.stop-bit.end);
      this._ctx.arc(bit.stop, this._height/2, this._rad,
                   start, end);
    } else if (bit.type === 1) {
      var start = 1*pi, end = 0.5*pi;
      if (isin === 1) 
        end = start - 0.5*pi*(xend-xstart)/(bit.end-bit.stop);
      if (isin === 2) 
        start = end + 0.5*pi*(xstart-xend)/(bit.stop-bit.end);
      this._ctx.arc(bit.end, this._height/2, this._rad,
                   start, end, true);
    } else if (bit.type === 2) {
      var start = 0.5*pi, end = 0;
      if (isin === 1) 
        end = start - 0.5*pi*(xend-xstart)/(bit.end-bit.stop);
      if (isin === 2) 
        start = end + 0.5*pi*(xstart-xend)/(bit.stop-bit.end);
      this._ctx.arc(bit.stop, this._height/2, this._rad,
                   start, end, true);
    } else if (bit.type === 3) {
      var start = 1*pi, end = 1.5*pi;
      if (isin === 1) 
        end = start + 0.5*pi*(xend-xstart)/(bit.end-bit.stop);
      if (isin === 2) 
        start = end - 0.5*pi*(xstart-xend)/(bit.stop-bit.end);
      this._ctx.arc(bit.end, this._height/2, this._rad,
                   start, end);
    }
  }

  SlideMenu.prototype.showLine = function(x, length, flip) {
    var self = this;
    var i, bits;
    
    if (flip) {
      this._ctx.save();
      this._ctx.translate(0, this._height);
      this._ctx.scale(1,-1);
      this._ctx.strokeStyle = '#62C6EF';
    }
    
    i = 0;
    bits = [];
    while (this._stops[i].end < x) {
      i++;
    }
    while (i < this._stops.length && 
           this._stops[i].stop <= x + length) {
      bits.push(this._stops[i]);
      i++;
    }
    
    this._ctx.beginPath();
    bits.forEach(function(b) {
      var xstart = b.stop,
          xend = b.end,
          isin = 0;;
      if (x > xstart) {
        xstart = x;
        isin = 2;
      }
      if (x+length < xend) {
        xend = x+length;
        isin = 1;
      }
      self._drawSegment(isin, b, xstart, xend);
    });
    // Draw the line
    this._ctx.stroke();
    
    if (flip) {
      this._ctx.restore();
    }
    
    
    
  }



  var Orbiter = function(logo) {
    var logoWidth = logo.innerWidth(),
        logoHeight = logo.innerHeight();
    var width = logoWidth,
        height = logoHeight * 1.4;
    this._width = width;
    this._height = height;
    var topcanvas = $("<canvas></canvas>")
        .attr("width", width)
        .attr("height", height);
    this._topcanvas = topcanvas;
    this._topctx = topcanvas[0].getContext("2d");
    var botcanvas = $("<canvas></canvas>")
        .attr("width", width)
        .attr("height", height);
    this._botcanvas = botcanvas;
    this._botctx = botcanvas[0].getContext("2d");
    logo.prepend(botcanvas);
    logo.append(topcanvas);
    this.startAnimation();
  }

  Orbiter.prototype.startAnimation = function() {
    var twoPI = 2 * Math.PI;
    var halfTurn = Math.PI/2;
    var top = this._topctx;
    var bot = this._botctx;
    var width = this._width;
    var height = this._height;
    var particle = -twoPI + halfTurn;
    var orbitWidth = Math.random() * width/2.2;
    var threshold = -367.3;
    if (width < 400) threshold = threshold * 300/460;
    var drawParticle = function(particle, size, orbitWidth) {
      var y = Math.sin(particle) * height/2.2 + height/2.2 + height*0.05;
      var x = Math.cos(particle) * orbitWidth + width/2;
      var alternate = (-y - 10*x/11) < threshold;
      if (Math.cos(particle) > 0) {
        top.fillStyle = alternate ? '#FFC200' : '#F494A2';
        top.beginPath();
        top.arc(x, y, size, 0, twoPI);
        top.fill();
      } else {
        bot.fillStyle = alternate ? '#FFC200' : '#F494A2';
        bot.beginPath();
        bot.arc(x, y, size, 0, twoPI);
        bot.fill();
      }
    }
    var history = [];
    var animation = function() {
      top.clearRect(0, 0, width, height);
      bot.clearRect(0, 0, width, height);
      history.push({p: particle, ow: orbitWidth});
      if (history.length >= 19) history.shift();
      history.forEach(function(h, i) {
        drawParticle(h.p, 5*(i+1)/20, h.ow);
      });
      drawParticle(particle, 5, orbitWidth);
      particle += 0.04;
      if (particle > halfTurn) {
        particle = -twoPI + halfTurn;
        orbitWidth = 2*(Math.random()-0.5) * width/2.2;
      }
      requestAnimationFrame(animation);
    }
    requestAnimationFrame(animation);
  }


  new Orbiter($(".logo"));


  var slideNav = $(".slide-nav");
  slideNav.on("mouseover", function() {
    if ($("body").innerWidth() >= 768) {
      console.log("loading sliding menu");
      new SlideMenu(slideNav);
      slideNav.off("mouseover");
    }
  });

});