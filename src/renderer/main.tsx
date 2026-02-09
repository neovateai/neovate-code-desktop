import './index.css';
import { RendererApp } from './core';
import {
  demoDashboardPlugin,
  demoDashboardWindowConfig,
} from './plugins/demo-dashboard/plugin';

const rendererApp = new RendererApp({
  plugins: [demoDashboardPlugin],
  windows: [demoDashboardWindowConfig],
});

rendererApp.start();
