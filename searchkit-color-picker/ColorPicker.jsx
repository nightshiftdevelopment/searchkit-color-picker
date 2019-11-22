import React from "react";
import { SketchPicker } from 'react-color';
import ColorPickerAccessor from "./ColorPickerAccessor";
import { ColorMapper } from "./ColorMapper";
import palette_img from "./ic_palette_black_48dp.png";

import {
  SearchkitComponent,
} from "searchkit";

export default class ColorPicker extends SearchkitComponent {
  constructor(props) {
    super(props);
    this.onColorSelected = this.onColorSelected.bind(this);
    this.colorMapper = new ColorMapper();
    this.handleClick = this.handleClick.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.state = {color: '#fff', displayColorPicker: {}, checkedLabels: {}, selectedColor: {}};

  }

  defineAccessor() {
    return new ColorPickerAccessor(this.props.id, this.props.colorField, this.props.labelField, {nested: this.props.nested, colorFieldPath:this.props.colorFieldPath, labelFieldPath: this.props.labelFieldPath, parent_doc_count: this.props.parentDocCount, labelField: true});
  }

  onColorSelected(color) {
    //update accessor
    var colorName = this.colorMapper.name(color.hex).name;
    this.accessor.addLabel(this.currentLabel);
    this.accessor.addColor(color.hsl);


    var displayColorPicker = this.state.displayColorPicker;
    displayColorPicker[this.currentLabel] = false;

    var selectedColor = this.state.selectedColor;
    selectedColor[this.currentLabel] = colorName;

    var checkedLabels = this.state.checkedLabels;
    checkedLabels[this.currentLabel] = true;
    console.log(checkedLabels);


    this.setState({color: color.hsl, displayColorPicker: displayColorPicker, selectedColor: selectedColor, checkedLabels: checkedLabels });
    this.searchkit.search();
  }

  handleLabelSelection(event, label) {
    var checkedLabels = this.state.checkedLabels;
    var selectedColor = this.state.selectedColor;

    if (event.target.checked) {
      this.currentLabel = label;
      checkedLabels[label] = true;
      this.accessor.addLabel(label);
      this.accessor.addColor(null);
    } else {
      this.currentLabel = null;
      checkedLabels[label] = false;

      selectedColor[label] = null;
      this.accessor.removeLabel(label);
    }

    this.setState({checkedLabels: checkedLabels, selectedColor: selectedColor});
    this.searchkit.search();

  }

  handleClick = (label) => {
    this.currentLabel = label;
    var displayColorPicker = this.state.displayColorPicker;
    if (label in displayColorPicker) {
      displayColorPicker[label] = !displayColorPicker[label];
    } else {
      displayColorPicker[label] = true;
    }
    this.setState({ displayColorPicker: displayColorPicker });
  };

  resetFilters = () => {
    this.accessor.resetFilters();
    this.currentLabel = null;
    this.setState({checkedLabels: {}, selectedColor: {}, displayColorPicker:{}});
    this.searchkit.search();
  }


  handleClose = () => {
    var displayColorPicker = this.state.displayColorPicker;
    displayColorPicker[this.currentLabel] = false;
    this.setState({ displayColorPicker: displayColorPicker });
  };

  render() {
    const popover = {
      position: 'absolute',
      zIndex: '2',
    }
    const cover = {
      position: 'fixed',
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px',
    }

    var aggs = this.accessor.getAggregations(['colorPickerTerms']);
    var parentDocCount = this.props.parentDocCount;

    if (aggs) {
      return (
        <React.Fragment>
          <div class="sk-panel">
            <div class="sk-panel__header">{this.props.header ? this.props.header  : "Annotations"}</div>
            <div class="sk-panel__content">
              <div data-qa="options" class="sk-item-list">
                {
                  aggs.colorPickerTerms.buckets.map(b => (
                    <div class="sk-item-list-option sk-item-list__item" data-qa="option" data-key="NSD">
                      <input type="checkbox" data-qa="checkbox" class="sk-item-list-option__checkbox" checked={this.state.checkedLabels[b.key]} onChange={(e)=>this.handleLabelSelection(e, b.key)} />
                        <div data-qa="label" class="sk-item-list-option__text">{b.key} {
                          this.state.selectedColor[b.key] ? (
                            <span style={{fontSize: "small"}}>[Color: <b>{this.state.selectedColor[b.key]}</b>]</span>
                          ) : <span onClick={() => this.handleClick(b.key)}><img src={palette_img} width="15px" alt="Color Palette" /></span>
                        }  </div>
                        <div data-qa="count" class="sk-item-list-option__count">{parentDocCount ? b.labels.doc_count : b.doc_count}</div>
                        {
                          this.state.displayColorPicker[b.key] ? (
                            <div style={ popover }>
                              <div style={ cover } onClick={ this.handleClose }/>
                                <SketchPicker
                                  onChangeComplete={ this.onColorSelected }
                                />
                            </div>
                          ) : null
                        }

                    </div>
                  ))
                }

                </div>
              </div>
            </div>
          <div>
            <button onClick={ this.resetFilters }>Reset Filters</button>
          </div>

        </React.Fragment>

      )
    } else {
      return null;
    }

  }

}
