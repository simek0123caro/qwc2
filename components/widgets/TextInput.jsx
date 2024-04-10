/**
 * Copyright 2024 Sourcepole AG
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import LocaleUtils from '../../utils/LocaleUtils';
import MiscUtils from '../../utils/MiscUtils';
import './style/TextInput.css';

class TextInput extends React.Component {
    static propTypes = {
        disabled: PropTypes.bool,
        multiline: PropTypes.bool,
        name: PropTypes.string,
        onChange: PropTypes.func,
        placeholder: PropTypes.string,
        readOnly: PropTypes.bool,
        required: PropTypes.bool,
        style: PropTypes.object,
        value: PropTypes.string
    };
    static defaultProps = {
        placeholder: ""
    };
    state = {
        value: "",
        valueRev: 0,
        curValue: "",
        changed: false
    };
    constructor(props) {
        super(props);
        this.skipNextCommitOnBlur = false;
        this.focusEnterClick = false;
        this.initialHeight = null;
        this.input = null;
        this.tooltipEl = null;
        this.tooltipTimeout = null;
    }
    static getDerivedStateFromProps(nextProps, state) {
        if (state.value !== nextProps.value) {
            return {
                value: nextProps.value,
                valueRev: state.valueRev + 1,
                curValue: nextProps.value || "",
                changed: false
            };
        }
        return null;
    }
    componentDidMount() {
        this.setDefaultValue(this.state.value, this.state.valueRev, -1);
    }
    componentDidUpdate(prevProps, prevState) {
        this.setDefaultValue(this.state.value, this.state.valueRev, prevState.valueRev);
    }
    setDefaultValue = (value, valueRev, prevValueRef) => {
        if (valueRev > prevValueRef) {
            this.input.innerHTML = value;
            // Move cursor to end
            if (this.input === document.activeElement) {
                const range = document.createRange();
                range.selectNodeContents(this.input);
                range.collapse(false);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    };
    render() {
        const className = classNames({
            "text-input": true,
            "text-input-disabled": this.props.disabled,
            "text-input-readonly": this.props.readOnly || !this.state.curValue,
            "text-input-invalid": this.props.required && !this.state.curValue
        });
        return (
            <div className="text-input-wrapper">
                {this.props.name ? (
                    <textarea
                        className="text-input-form-el"
                        name={this.props.name}
                        onChange={() => {}}
                        required={this.props.required}
                        value={this.state.curValue} />
                ) : null}
                <pre
                    className={className}
                    contentEditable={!this.props.disabled && !this.props.readOnly}
                    onBlur={this.onBlur}
                    onChange={this.onChange}
                    onClick={this.onClick}
                    onInput={this.onChange}
                    onKeyDown={this.onKeyDown}
                    onMouseDown={this.onMouseDown}
                    onMouseLeave={this.onMouseLeave}
                    onMouseMove={this.onMouseMove}
                    ref={el => {this.input = el;}}
                    style={this.props.style}
                />
                {!this.state.curValue ? (
                    <div className="text-input-placeholder">{this.props.placeholder}</div>
                ) : null}
                {this.props.multiline ? (
                    <div
                        className="text-input-resize-handle"
                        onMouseDown={this.startResize} />
                ) : null}
            </div>
        );
    }
    onChange = (ev) => {
        const curValue = ev.target.innerText.replace(/<br\s*\/?>$/, '').replace(/\n$/, '');
        this.setState({curValue: curValue, changed: true});
    };
    onBlur = () => {
        if (!this.skipNextCommitOnBlur) {
            this.commit();
        }
    };
    onClick = (ev) => {
        if (ev.ctrlKey && this.focusEnterClick && ev.target.nodeName === 'A' && ev.target.href) {
            window.open(ev.target.href, "_blank");
        }
    };
    onMouseDown = () => {
        this.focusEnterClick = document.activeElement !== this.input;
    };
    onMouseMove = (ev) => {
        const isTouch = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
        clearTimeout(this.tooltipTimeout);
        const editable = !this.props.disabled && !this.props.readOnly;
        if (!isTouch && editable && ev.target.nodeName === 'A') {
            const rect = ev.target.getBoundingClientRect();
            const left = rect.left + window.scrollX;
            const bottom = rect.bottom + window.scrollY + 2;
            this.tooltipTimeout = setTimeout(() => {
                if (!this.tooltipEl) {
                    this.tooltipEl = document.createElement("span");
                    this.tooltipEl.className = "text-input-link-tooltip";
                    this.tooltipEl.innerHTML = LocaleUtils.tr("misc.ctrlclickhint");
                    this.tooltipEl.style.position = 'absolute';
                    this.tooltipEl.style.zIndex = 10000000000;
                    document.body.appendChild(this.tooltipEl);
                }
                this.tooltipEl.style.left = left + 'px';
                this.tooltipEl.style.top = bottom + 'px';
                this.tooltipTimeout = null;
            }, 250);
        } else if (this.tooltipEl) {
            document.body.removeChild(this.tooltipEl);
            this.tooltipEl = null;
        }
    };
    onMouseLeave = () => {
        clearTimeout(this.tooltipTimeout);
        if (this.tooltipEl) {
            document.body.removeChild(this.tooltipEl);
            this.tooltipEl = null;
        }
    };
    onKeyDown = (ev) => {
        if (ev.keyCode === 17) { // Ctrl
            const prevValue = this.input.contentEditable;
            this.input.contentEditable = false;
            window.addEventListener("keyup", () => {
                this.input.contentEditable = prevValue;
            }, {once: true});
        } else if (ev.keyCode === 13 && !this.props.multiline) { // Enter
            ev.preventDefault();
            this.commit();
        } else if (ev.keyCode === 27) { // Esc
            this.setState((state) => ({
                value: this.props.value,
                valueRev: state.valueRev + 1,
                curValue: this.props.value || "",
                changed: false
            }));
            this.skipNextCommitOnBlur = true;
            ev.target.blur();
        }
    };
    commit = () => {
        if (this.state.changed) {
            const valueWithLinks = MiscUtils.addLinkAnchors(this.state.curValue);
            this.props.onChange(valueWithLinks);
        }
    };
    startResize = (ev) => {
        const input = ev.target.previousElementSibling;
        if (!input) {
            return;
        }
        const startHeight = input.offsetHeight;
        if (this.initialHeight === null) {
            this.initialHeight = startHeight;
        }
        const startMouseY = ev.clientY;
        const resizeInput = (event) => {
            input.style.height = Math.max(this.initialHeight, (startHeight + (event.clientY - startMouseY))) + 'px';
        };
        document.body.style.userSelect = 'none';
        window.addEventListener("mousemove", resizeInput);
        window.addEventListener("mouseup", () => {
            document.body.style.userSelect = '';
            window.removeEventListener("mousemove", resizeInput);
        }, {once: true});
    };
}

export default TextInput;
