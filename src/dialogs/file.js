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

import {h, app} from 'hyperapp';
import {
  BoxContainer,
  Input,
  ListView,
  adapters
} from '@osjs/gui';

import Dialog from '../dialog';

const getMountpoints = core => core.make('osjs/fs')
  .mountpoints(true)
  .reduce((mounts, iter) => Object.assign(mounts, {
    [iter.name]: iter.label
  }), {});

/**
 * Default OS.js File Dialog
 */
export default class FileDialog extends Dialog {

  /**
   * Constructor
   * @param {Core} core OS.js Core reference
   * @param {Object} args Arguments given from service creation
   * @param {String} [args.title] Dialog title
   * @param {Function} callback The callback function
   */
  constructor(core, args, callback) {
    args = Object.assign({}, {
      title: null,
      type: 'open',
      path: null,
      filename: null,
      mime: []
    }, args);

    if (!args.path) {
      args.path = core.config('vfs.defaultPath');
    }

    const title = args.title
      ? args.title
      : (args.type === 'open' ? 'Open file' : 'Save file');

    super(core, args, {
      className: 'file',
      window: {
        title,
        attributes: {
          resizable: true
        },
        dimension: {
          width: 400,
          height: 400
        }
      },
      buttons: ['ok', 'cancel']
    }, callback);
  }

  render() {
    super.render(($content) => {
      const a = app({
        filename: this.args.filename,
        listview: adapters.listview.state({
          onselect: (item) => {
            a.setFilename(item.isFile ? item.filename : null);
            this.value = item.isFile ? item : null;
          },
          onactivate: (item, ev) => {
            if (item.isDirectory) {
              a.setFilename(null);
              a.setPath(item.path);
            } else {
              this.value = item.isFile ? item : null;
              this.emitCallback(this.getPositiveButton(), ev, true);
            }
          },
          class: 'osjs-gui-absolute-fill',
          columns: [{
            label: 'Name'
          }, {
            label: 'Type'
          }, {
            label: 'Size'
          }]
        })
      }, {
        _readdir: ({path, files}) => (state, actions) => {
          const listview = state.listview;
          listview.selectedIndex = -1;
          listview.rows = files.map(file => ({
            columns: [{label: file.filename}, file.mime, file.humanSize],
            data: file
          }));

          return {path, listview};
        },

        setPath: path => async (state, actions) => {
          if (typeof path !== 'string') {
            path = path.path;
          }

          const files = await this.core.make('osjs/vfs')
            .readdir(path, {
              filter: (item) => {
                if (this.args.mime) {
                  return item.mime
                    ? this.args.mime.some(test => (new RegExp(test)).test(item.mime))
                    : true;
                }

                return true;
              }
            });

          actions._readdir({path, files});
        },

        setFilename: filename => state => ({filename}),

        listview: adapters.listview.actions()
      }, (state, actions) => this.createView([
        h(BoxContainer, {}, [
          h(Input, {
            type: 'select',
            choices: getMountpoints(this.core),
            onchange: val => a.setPath(val + ':/')
          })
        ]),
        h(BoxContainer, {grow: 1}, [
          h(ListView, adapters.listview.proxy(state.listview, actions.listview))
        ]),
        h(BoxContainer, {style: {display: this.args.type === 'save' ? null : 'none'}}, [
          h(Input, {
            type: 'text',
            placeholder: 'Filename',
            value: state.filename,
            onenter: (value, ev) => this.emitCallback(this.getPositiveButton(), ev, true)
          })
        ]),
      ]), $content);

      a.setPath(this.args.path);
    });
  }

  getValue() {
    if (this.args.type === 'save') {
      const filename = this.win.$content.querySelector('input[type=text]')
        .value;

      const path = this.args.path.replace(/\/?$/, '/') + filename;

      return filename
        ? {path, filename}
        : undefined;
    }

    return super.getValue();
  }

}
