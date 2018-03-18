/*
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2018, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

import {h} from 'hyperapp';
import merge from 'deepmerge';
import {
  Box,
  BoxContainer,
  Button,
  Toolbar
} from '@osjs/gui';

let dialogCount = 0;

/*
 * Default button attributes
 */
const defaultButtons = {
  ok: {label: 'Ok'},
  close: {label: 'Close'},
  cancel: {label: 'Cancel'},
  yes: {label: 'Yes'},
  no: {label: 'No'}
};

/*
 * Creates a button from name
 */
const defaultButton = n => {
  if (defaultButtons[n]) {
    return Object.assign({}, {
      name: n
    }, defaultButtons[n]);
  }

  return {label: n, name: n};
};

/*
 * Creates options
 */
const createOptions = (options, args) =>
  merge({
    id: null,
    className: 'unknown',
    defaultValue: null,
    buttons: [],
    window: {
      id: options.id || 'Dialog_' + String(dialogCount),
      title: 'Dialog',
      attributes: {
        gravity: 'center',
        resizable: false,
        maximizable: false,
        minimizable: false,
        classNames: [
          'osjs-dialog',
          `osjs-${options.className || 'unknown'}-dialog`
        ],
        minDimension: {
          width: 300,
          height: 100
        },
      }
    }
  }, options);

/**
 * OS.js default Dialog implementation
 *
 * Creates a Window with predefined content and actions(s)
 */
export default class Dialog {

  /**
   * Constructor
   * @param {Core} core OS.js Core reference
   * @param {Object} args Arguments given from service creation
   * @param {Object} options Dialog options (including Window)
   * @param {Object} [options.defaultValue] Default callback value
   * @param {Function} callback The callback function
   */
  constructor(core, args, options, callback) {
    this.core = core;
    this.args = args;
    this.callback = callback || function() {};
    this.options = createOptions(options, args);
    this.win = core.make('osjs/window', Object.assign({}, {
      parent: args.parent
    }, this.options.window));
    this.value = undefined;
    this.buttons = this.options.buttons.map(n =>
      typeof n === 'string'
        ? defaultButton(n)
        : {
          label: n.label || 'button',
          name: n.name || 'unknown'
        });

    dialogCount++;
  }

  /**
   * Destroys the dialog
   */
  destroy() {
    this.win.destroy();
    this.win = null;
    this.callback = null;
  }

  /**
   * Renders the dialog
   * @param {Function} cb Callback from window
   */
  render(cb) {
    let called;
    const callback = (...args) => {
      if (called) {
        return;
      }
      called = true;

      console.debug('Callback in dialog', args);

      this.callback(...args);
    };

    this.win.on('dialog:button', (name, ev) => {
      callback(name, this.value, ev);
      this.destroy();
    });

    this.win.on('destroy', () => {
      callback('destroy', this.value, null);
    });

    this.win.on('render', () => {
      this.win.resizeFit();
    });

    this.win.init();
    this.win.render(cb);
    this.win.focus();
  }

  /**
   * Creates the default view
   * @param {Object[]} children Child nodes
   * @return {Object} Virtual dom node
   */
  createView(children) {
    return h(Box, {}, [
      ...children,
      h(BoxContainer, {class: 'osjs-dialog-buttons'}, [
        h(Toolbar, {}, [
          ...this.createButtons()
        ])
      ])
    ]);
  }

  /**
   * Gets the button (virtual) DOM elements
   * @return {Object[]} Virtual dom node children list
   */
  createButtons() {
    const onclick = (n, ev) => {
      this.win.emit('dialog:button', n, ev);
    };

    return this.buttons.map(b => h(Button, Object.assign({}, {
      onclick: ev => onclick(b.name, ev)
    }, b)));
  }

  /**
   * Gets the dialog result value
   * @return {*}
   */
  getValue() {
    return typeof this.value === 'undefined'
      ? this.options.defaultValue
      : this.value;
  }

}
