import { render } from 'solid-js/web';

import 'splitting/dist/splitting.css';
import 'splitting/dist/splitting-cells.css';
import Splitting from 'splitting';

Splitting();

import App from './App';
import './index.css';

render(() => <App />, document.getElementById('root') as HTMLElement);
