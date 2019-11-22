import {
  Accessor,
  FieldContextFactory,
  FieldOptions
} from "searchkit";

const assign = require("lodash/assign")
const isUndefined = require("lodash/isUndefined")


export interface FacetAccessorOptions {
  operator?:string,
  title?:string,
  id?:string,
  field:string,
  size:number,
  facetsPerPage?:number,
  translations?:Object,
  include?:Array<string> | string,
  exclude?:Array<string> | string,
  orderKey?:string,
  orderDirection?:string,
  min_doc_count?:number,
  loadAggregations?: boolean,
  fieldOptions?:FieldOptions,
  nested?: boolean
}

export interface ISizeOption {
  label:string,
  size:number
}

export default class ColorPickerAccessor extends Accessor {

  constructor(key, colorField, labelField, options) {
    super(key, options.id)
    this.colorField = colorField;
    this.labelField = labelField;
    this.options = options;
    this.defaultSize = options.size || 10;
    this.options.facetsPerPage = this.options.facetsPerPage || 50
    this.size = this.defaultSize;
    this.loadAggregations = isUndefined(this.options.loadAggregations) ? true : this.options.loadAggregations
    if(options.translations){
      this.translations = assign({}, this.translations, options.translations)
    }
    this.options.fieldOptions = this.options.fieldOptions || {type:"embedded"}
    this.options.fieldOptions.field = this.options.field
    this.fieldContext = FieldContextFactory(this.options.fieldOptions)
  }

  getOrder(){
    if(this.options.orderKey){
      let orderDirection = this.options.orderDirection || "asc"
      return {[this.options.orderKey]:orderDirection}
    }
  }

  isOrOperator(){
    return this.options.operator === "OR"
  }

  addLabel(label) {
    if (this.label) {
      this.label.push(label);
    } else {
      this.label = [label];
    }
  }

  addColor(colorObj) {

    if (this.color) {
      if (colorObj) {
        this.color.push({
          h: colorObj.h,
          s: colorObj.s * 100,
          l: colorObj.l *100
        });
      } else {
        this.color.push(null);
      }

    } else {
      if (colorObj) {
        this.color = [{
          h: colorObj.h,
          s: colorObj.s * 100,
          l: colorObj.l *100
        }];
      } else {
        this.color = [null];
      }

    }
  }

  setResults(results) {
    super.setResults(results);
  }

  buildOwnQuery(query) {
    var agg = {
      "terms": {
        "field": this.labelField,
        "size": this.defaultSize
      }
    };

    var wholeQuery = {
     "colorPickerTerms": {}
    };

    if (this.options.nested && this.options.labelFieldPath) {

     if (this.options.parent_doc_count) {
       wholeQuery.colorPickerTerms = {
         "nested": {
           "path": this.options.labelFieldPath
         },
         "aggs": {
           "labels": {
             "terms": {
               "field": this.labelField,
               "size": this.defaultSize
             },
             "aggs": {
               "files": {
                 "reverse_nested": {}
               }
             }
           }
         }
       }
     } else {
       wholeQuery.colorPickerTerms = {
         "nested": {
           "path": this.options.labelFieldPath
         },
         "aggs": {
           "colorPickerTerms": agg
         }
       }
     }
    } else {
     wholeQuery.colorPickerTerms = agg;
    }

    return query.setAggs(wholeQuery);
  }

  removeLabel(label) {
    var i = this.label.indexOf(label);
    if (i !== -1) {
      this.label.splice(i, 1);
      this.color.splice(i, 1);
    }
  }

  resetFilters() {
    this.label = [];
    this.color = [];
  }

  buildSharedQuery(query) {
    var q = {
      bool: {
        must: []
      }
    }
    if (this.color && this.label) {

      for (var i=0; i < this.color.length; i++) {
        var currColor = this.color[i];
        var labelObj = {"term": {}};
        labelObj.term[this.labelField] = this.label[i];

        if (currColor) {
          var hObj = { "range": {} };
          hObj['range'][this.colorField + ".h"] = {
            gte: (currColor.h - currColor.h * 0.2),
            lte: (currColor.h + currColor.h * 0.2)
          };

          var sObj = { "range": {} };
          sObj['range'][this.colorField + ".s"] = {
            gte: (currColor.s - currColor.s * 0.2),
            lte: (currColor.s + currColor.s * 0.2)
          };

          var lObj = {"range": {} };
          lObj['range'][this.colorField + ".l"] = {
            gte: (currColor.l- currColor.l * 0.2),
            lte: (currColor.l + currColor.l * 0.2)
          };

          if (this.options.colorFieldPath) {
            //if the colors field is a nested array of objects as well.
            q.bool.must.push({
              "nested": {
                "path": this.options.labelFieldPath,
                "query": {
                  "bool": {
                    "must": [
                      labelObj,
                      {
                        "nested": {
                          "path": this.options.colorFieldPath,
                          "query": {
                            "bool": {
                              "must": [hObj, sObj, lObj]
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            });
          } else {
            q.bool.must.push({
              nested: {
                path: this.options.labelFieldPath,
                query: {
                  bool: {
                    must: [labelObj, hObj, sObj, lObj]
                  }
                }
              }
            });
          }
        } else {
          q.bool.must.push({
            "nested": {
              "path": this.options.labelFieldPath,
              "query": labelObj
            }
          });
        }
      }

      return query.addQuery(q);

    } else if (this.label) {
      for (var i=0; i< this.label.length; i++) {
        var labelObj = {"term": {}};
        labelObj.term[this.labelField] = this.label[i];
        q.bool.must.push({
          "nested": {
            "path": this.options.labelFieldPath,
            "query": labelObj
          }
        });
      }
      return query.addQuery(q);
    }

     return query;
   }

}
