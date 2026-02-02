const SCRIPT_URL = 'https://unpkg.com/react-grab@0.0.98/dist/index.global.js';

// TODO: How to use plugin???
export const INJECT_SCRIPT = `
(function() {
  if (window.__REACT_GRAB__) return;
  
  // 创建安全的全局对象
  window.neovateInspector = window.neovateInspector || {};
  
  const script = document.createElement('script');
  script.src = '${SCRIPT_URL}';

  const onActivate = (flag) => {
    if (flag) {
      console.log('NEOVATE_INSPECTOR_ACTIVATED');
    } else {
      console.log('NEOVATE_INSPECTOR_DEACTIVATED');
    }
  }
  
  script.onload = () => {
    console.log('ReactGrab script loaded successfully');
    
    // 延迟检查以确保ReactGrab完全初始化
    setTimeout(() => {
      if (window.__REACT_GRAB__) {
        console.log('ReactGrab is available');
        
        // 注册Neovate插件
        try {
          window.__REACT_GRAB__.registerPlugin({ 
            name: "neovate", 
            hooks: {
              onElementSelect: (content) => {
                console.log('NEOVATE_ELEMENT_SELECTED:' + JSON.stringify({content}));
              },
              onAfterCopy: () => {
                console.log('copy')
              }
            }
          });
          console.log('Neovate plugin registered successfully');
        } catch (error) {
          console.error('Failed to register neovate plugin:', error);
        }
        
        // 设置切换函数
        window.neovateInspector.toggle = () => {
          try {
            if (window.__REACT_GRAB__ && typeof window.__REACT_GRAB__.toggle === 'function') {
              window.__REACT_GRAB__.toggle();
              console.log('Inspector toggled');
              
              // 检查当前状态并发送相应消息
              setTimeout(() => {
                try {
                  const isActive = window.__REACT_GRAB__.isActive?.() || false;
                  onActivate(isActive);
                } catch (error) {
                  console.error('Error checking inspector state:', error);
                }
              }, 50);
            } else {
              console.warn('ReactGrab toggle function not available');
            }
          } catch (error) {
            console.error('Error toggling inspector:', error);
          }
        };
      } else {
        console.error('ReactGrab not available after script load');
        window.neovateInspector.toggle = () => {
          console.warn('ReactGrab not loaded - toggle unavailable');
        };
      }
    }, 100);
  };
  
  script.onerror = () => {
    console.error('Failed to load ReactGrab from CDN');
    window.neovateInspector.toggle = () => {
      console.warn('ReactGrab failed to load - inspector unavailable');
    };
  };
  
  document.head.appendChild(script);
})();
`;
