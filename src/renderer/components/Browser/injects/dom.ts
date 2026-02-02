// 注入此脚本实现基础dom选择能力
// webview
//         .executeJavaScript(INJECT_SCRIPT, true)
//         .then((r) => console.log('Inspector injected:', r))
//         .catch((e) => console.error('Failed to inject inspector:', e));
export const INJECT_SCRIPT = `
(function() {
  try {
    if (window.neovateInspector) return;
    
  var inspector = {
    overlay: null,
    currentElement: null,
    isActive: false,
    tooltip: null,
    
    init: function() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', this.createOverlay.bind(this));
      } else {
        this.createOverlay();
      }
      this.bindEvents();
      this.createTooltip();
    },
      
      createOverlay: function() {
        try {
          if (document.getElementById('neovate-inspector-overlay')) return;
          
          this.overlay = document.createElement('div');
          this.overlay.id = 'neovate-inspector-overlay';
          this.overlay.style.position = 'fixed';
          this.overlay.style.pointerEvents = 'none';
          this.overlay.style.border = '2px solid #3b82f6';
          this.overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
          this.overlay.style.zIndex = '10000';
          this.overlay.style.display = 'none';
          this.overlay.style.transition = 'all 0.1s ease';
          
          if (document.body) {
            document.body.appendChild(this.overlay);
          }
        } catch (e) {
          console.error('Failed to create overlay:', e);
        }
      },
      
      bindEvents: function() {
        var self = this;
        
        document.addEventListener('mousemove', function(e) {
          try {
            if (!self.isActive || !self.overlay) return;
            
            var element = document.elementFromPoint(e.clientX, e.clientY);
            if (!element || element === self.overlay || element.id === 'neovate-inspector-overlay') return;
            
            self.currentElement = element;
            self.highlightElement(element);
            self.showTooltip(element, e.clientX, e.clientY);
          } catch (e) {
            console.error('Error in mousemove:', e);
          }
        }),
        
        document.addEventListener('click', function(e) {
          try {
            if (!self.isActive) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            if (self.currentElement) {
              var content = self.extractElementContent(self.currentElement);
              console.log('NEOVATE_ELEMENT_SELECTED:' + JSON.stringify(content));
            }
            
            self.deactivate();
          } catch (e) {
            console.error('Error in click:', e);
          }
        }, true);
        
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && self.isActive) {
            self.deactivate();
          }
        });
      },
      
      highlightElement: function(element) {
        try {
          if (!this.overlay) return;
          
          var rect = element.getBoundingClientRect();
          this.overlay.style.display = 'block';
          this.overlay.style.left = rect.left + 'px';
          this.overlay.style.top = rect.top + 'px';
          this.overlay.style.width = rect.width + 'px';
          this.overlay.style.height = rect.height + 'px';
        } catch (e) {
          console.error('Error highlighting element:', e);
        }
      },
      
      extractElementContent: function(element) {
        try {
          var tagName = element.tagName ? element.tagName.toLowerCase() : 'unknown';
          var attributes = {};
          
          if (element.attributes) {
            for (var i = 0; i < element.attributes.length; i++) {
              var attr = element.attributes[i];
              attributes[attr.name] = attr.value;
            }
          }
          
          var textContent = '';
          if (tagName === 'img' && element.src) {
            textContent = element.src;
          } else if (tagName === 'a' && element.href) {
            textContent = element.href;
          } else if (element.textContent) {
            textContent = element.textContent.trim();
          }
          
          var rect = element.getBoundingClientRect ? element.getBoundingClientRect() : {left: 0, top: 0, width: 0, height: 0};
          
          return {
            tagName: tagName,
            attributes: attributes,
            textContent: textContent,
            position: {
              x: rect.left || 0,
              y: rect.top || 0,
              width: rect.width || 0,
              height: rect.height || 0
            },
            selector: this.generateSelector(element)
          };
        } catch (e) {
          console.error('Error extracting content:', e);
          return {
            tagName: 'error',
            attributes: {},
            textContent: '',
            position: {x: 0, y: 0, width: 0, height: 0},
            selector: ''
          };
        }
      },
      
      generateSelector: function(element) {
        try {
          if (element.id) {
            return '#' + element.id;
          }
          
          var path = [];
          var current = element;
          while (current && current !== document.body && current.tagName) {
            var selector = current.tagName.toLowerCase();
            if (current.className && typeof current.className === 'string' && current.className.trim()) {
              selector += '.' + current.className.trim().split(' ').join('.');
            }
            path.unshift(selector);
            current = current.parentElement;
          }
          
          return path.join(' > ') || 'body';
        } catch (e) {
          console.error('Error generating selector:', e);
          return 'error';
        }
      },
      
      activate: function() {
        try {
          this.isActive = true;
          if (document.body) {
            document.body.style.cursor = 'crosshair';
          }
          console.log('NEOVATE_INSPECTOR_ACTIVATED');
        } catch (e) {
          console.error('Error activating inspector:', e);
        }
      },
      
      createTooltip: function() {
        try {
          if (document.getElementById('neovate-inspector-tooltip')) return;
          
          this.tooltip = document.createElement('div');
          this.tooltip.id = 'neovate-inspector-tooltip';
          this.tooltip.style.position = 'fixed';
          this.tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          this.tooltip.style.color = 'white';
          this.tooltip.style.padding = '8px 12px';
          this.tooltip.style.borderRadius = '4px';
          this.tooltip.style.fontSize = '12px';
          this.tooltip.style.fontFamily = 'monospace';
          this.tooltip.style.zIndex = '10001';
          this.tooltip.style.pointerEvents = 'none';
          this.tooltip.style.maxWidth = '300px';
          this.tooltip.style.whiteSpace = 'nowrap';
          this.tooltip.style.overflow = 'hidden';
          this.tooltip.style.textOverflow = 'ellipsis';
          this.tooltip.style.display = 'none';
          this.tooltip.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
          
          if (document.body) {
            document.body.appendChild(this.tooltip);
          }
        } catch (e) {
          console.error('Failed to create tooltip:', e);
        }
      },
      
      showTooltip: function(element, x, y) {
        try {
          if (!this.tooltip || !element) return;
          
          var tagName = element.tagName ? element.tagName.toLowerCase() : 'unknown';
          var id = element.id ? '#' + element.id : '';
          var className = element.className && typeof element.className === 'string' && element.className.trim() 
            ? '.' + element.className.trim().split(' ').join('.') 
            : '';
          
          var text = tagName + id + className;
          if (text.length > 50) {
            text = text.substring(0, 47) + '...';
          }
          
          this.tooltip.textContent = text;
          this.tooltip.style.display = 'block';
          
          // 定位提示框，避免超出屏幕
          var tooltipWidth = 300;
          var tooltipHeight = 30;
          var windowWidth = window.innerWidth;
          var windowHeight = window.innerHeight;
          
          var left = x + 10;
          var top = y + 10;
          
          if (left + tooltipWidth > windowWidth) {
            left = x - tooltipWidth - 10;
          }
          
          if (top + tooltipHeight > windowHeight) {
            top = y - tooltipHeight - 10;
          }
          
          this.tooltip.style.left = Math.max(0, left) + 'px';
          this.tooltip.style.top = Math.max(0, top) + 'px';
        } catch (e) {
          console.error('Error showing tooltip:', e);
        }
      },
      
      hideTooltip: function() {
        try {
          if (this.tooltip) {
            this.tooltip.style.display = 'none';
          }
        } catch (e) {
          console.error('Error hiding tooltip:', e);
        }
      },
      
      deactivate: function() {
        try {
          this.isActive = false;
          if (this.overlay) {
            this.overlay.style.display = 'none';
          }
          this.hideTooltip();
          if (document.body) {
            document.body.style.cursor = '';
          }
          console.log('NEOVATE_INSPECTOR_DEACTIVATED');
        } catch (e) {
          console.error('Error deactivating inspector:', e);
        }
      },
      
      toggle: function() {
        try {
          if (this.isActive) {
            this.deactivate();
          } else {
            this.activate();
          }
        } catch (e) {
          console.error('Error toggling inspector:', e);
        }
      }
    };
    
    try {
      inspector.init();
      window.neovateInspector = inspector;
    } catch (e) {
      console.error('Failed to initialize inspector:', e);
    }
  } catch (e) {
    console.error('Global error in inspector script:', e);
  }
})();
`;
