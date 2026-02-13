import './index.css';
import { RendererApp } from './core';
import { demoPlugin } from './plugins/demo';

const rendererApp = new RendererApp({
  plugins: [demoPlugin],
  windows: [
    {
      windowType: 'demo',
      componentLoader: () => import('./plugins/demo/DemoWindow'),
    },
  ],
});

rendererApp.start();
