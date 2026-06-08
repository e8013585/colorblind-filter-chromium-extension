(function (global) {
  "use strict";

  function matrixToString(matrix) {
    return matrix
      .map(function (v) {
        return parseFloat(v.toFixed(6));
      })
      .join(" ");
  }

  var IDENTITY_MATRIX = [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0
  ];

  function interpolateMatrix(filterMatrix, intensity) {
    var t = Math.max(0, Math.min(1, intensity / 100));
    return filterMatrix.map(function (v, i) {
      return IDENTITY_MATRIX[i] + (v - IDENTITY_MATRIX[i]) * t;
    });
  }

  function buildFilter(id, matrix) {
    var valStr = matrixToString(matrix);
    return (
      '<filter id="' + id + '" ' +
      'x="-20%" y="-20%" width="140%" height="140%" ' +
      'color-interpolation-filters="sRGB">' +
      '<feColorMatrix type="matrix" values="' + valStr + '"/>' +
      '</filter>'
    );
  }

  function buildFilterWithIntensity(id, matrix, intensity) {
    var interpolated = interpolateMatrix(matrix, intensity);
    return buildFilter(id, interpolated);
  }

  var PROTANOPIA_SIM_MATRIX = [
    0.567, 0.433, 0,     0, 0,
    0.558, 0.442, 0,     0, 0,
    0,     0.242, 0.758, 0, 0,
    0,     0,     0,     1, 0
  ];

  var PROTANOMALY_SIM_MATRIX = [
    0.817, 0.183, 0,     0, 0,
    0.333, 0.667, 0,     0, 0,
    0,     0.125, 0.875, 0, 0,
    0,     0,     0,     1, 0
  ];

  var DEUTERANOPIA_SIM_MATRIX = [
    0.625, 0.375, 0,   0, 0,
    0.700, 0.300, 0,   0, 0,
    0,     0.300, 0.7, 0, 0,
    0,     0,     0,   1, 0
  ];

  var DEUTERANOMALY_SIM_MATRIX = [
    0.800, 0.200, 0,     0, 0,
    0.258, 0.742, 0,     0, 0,
    0,     0.142, 0.858, 0, 0,
    0,     0,     0,     1, 0
  ];

  var TRITANOPIA_SIM_MATRIX = [
    0.950, 0.050, 0,     0, 0,
    0,     0.433, 0.567, 0, 0,
    0,     0.475, 0.525, 0, 0,
    0,     0,     0,     1, 0
  ];

  var TRITANOMALY_SIM_MATRIX = [
    0.967, 0.033, 0,     0, 0,
    0,     0.733, 0.267, 0, 0,
    0,     0.183, 0.817, 0, 0,
    0,     0,     0,     1, 0
  ];

  var ACHROMATOPSIA_SIM_MATRIX = [
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0,      0,      0,      1, 0
  ];

  var ACHROMATOMALY_SIM_MATRIX = [
    0.618, 0.320, 0.062, 0, 0,
    0.163, 0.775, 0.062, 0, 0,
    0.163, 0.320, 0.516, 0, 0,
    0,     0,     0,     1, 0
  ];

  function buildDaltonizationFilter(id, simMatrix, corrMatrix, intensity) {
    var interpSim = interpolateMatrix(simMatrix, intensity);
    var simStr     = matrixToString(interpSim);
    var corrStr    = matrixToString(corrMatrix);

    return (
      '<filter id="' + id + '" ' +
      'x="-20%" y="-20%" width="140%" height="140%" ' +
      'color-interpolation-filters="sRGB">' +

      '<feColorMatrix in="SourceGraphic" type="matrix" ' +
      'values="' + simStr + '" result="cvd_sim"/>' +

      '<feComposite in="SourceGraphic" in2="cvd_sim" ' +
      'operator="arithmetic" k1="0" k2="1" k3="-1" k4="0" ' +
      'result="cvd_error"/>' +

      '<feColorMatrix in="cvd_error" type="matrix" ' +
      'values="' + corrStr + '" result="cvd_corrected_error"/>' +

      '<feComposite in="SourceGraphic" in2="cvd_corrected_error" ' +
      'operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>' +

      '</filter>'
    );
  }

  var PROTANOPIA_CORR_MATRIX = [
    0,   0,   0, 0, 0,
    0.7, 1,   0, 0, 0,
    0.7, 0,   1, 0, 0,
    0,   0,   0, 1, 0
  ];

  var DEUTERANOPIA_CORR_MATRIX = [
    1,   0.7, 0, 0, 0,
    0,   0,   0, 0, 0,
    0,   0.7, 1, 0, 0,
    0,   0,   0, 1, 0
  ];

  var TRITANOPIA_CORR_MATRIX = [
    1, 0, 0.7, 0, 0,
    0, 1, 0.7, 0, 0,
    0, 0, 0,   0, 0,
    0, 0, 0,   1, 0
  ];

  function buildHighContrastFilter(id, intensity) {
    var t = Math.max(0, Math.min(1, intensity / 100));
    var saturation  = 1 + (1.8 - 1) * t;
    var slope       = 1 + (1.5 - 1) * t;
    var intercept   = 0 + (-0.15 - 0) * t;

    return (
      '<filter id="' + id + '" ' +
      'x="-20%" y="-20%" width="140%" height="140%" ' +
      'color-interpolation-filters="sRGB">' +

      '<feColorMatrix type="saturate" values="' + saturation.toFixed(4) + '" ' +
      'result="saturated"/>' +

      '<feComponentTransfer in="saturated">' +
      '<feFuncR type="linear" slope="' + slope.toFixed(4) + '" intercept="' + intercept.toFixed(4) + '"/>' +
      '<feFuncG type="linear" slope="' + slope.toFixed(4) + '" intercept="' + intercept.toFixed(4) + '"/>' +
      '<feFuncB type="linear" slope="' + slope.toFixed(4) + '" intercept="' + intercept.toFixed(4) + '"/>' +
      '</feComponentTransfer>' +

      '</filter>'
    );
  }

  function buildMonochromeContrastFilter(id, intensity) {
    var t = Math.max(0, Math.min(1, intensity / 100));

    var grayMatrix = interpolateMatrix(ACHROMATOPSIA_SIM_MATRIX, intensity);
    var grayStr    = matrixToString(grayMatrix);

    var slope     = 1 + (1.6 - 1) * t;
    var intercept = 0 + (-0.2 - 0) * t;

    return (
      '<filter id="' + id + '" ' +
      'x="-20%" y="-20%" width="140%" height="140%" ' +
      'color-interpolation-filters="sRGB">' +

      '<feColorMatrix type="matrix" values="' + grayStr + '" result="gray"/>' +

      '<feComponentTransfer in="gray">' +
      '<feFuncR type="linear" slope="' + slope.toFixed(4) + '" intercept="' + intercept.toFixed(4) + '"/>' +
      '<feFuncG type="linear" slope="' + slope.toFixed(4) + '" intercept="' + intercept.toFixed(4) + '"/>' +
      '<feFuncB type="linear" slope="' + slope.toFixed(4) + '" intercept="' + intercept.toFixed(4) + '"/>' +
      '</feComponentTransfer>' +

      '</filter>'
    );
  }

  var CVD_FILTERS = [

    {
      id:             "protanopia_sim",
      nameKey:        "filterProtanopiaName",
      descriptionKey: "filterProtanopiaDesc",
      prevalenceKey:  "filterProtanopiaPrevalence",
      category:       "red_green",
      mode:           "simulation",
      matrix:         PROTANOPIA_SIM_MATRIX,
      svgFilter: function (intensity) {
        return buildFilterWithIntensity("protanopia_sim", PROTANOPIA_SIM_MATRIX, intensity);
      }
    },

    {
      id:             "protanomaly_sim",
      nameKey:        "filterProtanomalyName",
      descriptionKey: "filterProtanomalyDesc",
      prevalenceKey:  "filterProtanomalyPrevalence",
      category:       "red_green",
      mode:           "simulation",
      matrix:         PROTANOMALY_SIM_MATRIX,
      svgFilter: function (intensity) {
        return buildFilterWithIntensity("protanomaly_sim", PROTANOMALY_SIM_MATRIX, intensity);
      }
    },

    {
      id:             "deuteranopia_sim",
      nameKey:        "filterDeuteranopiaName",
      descriptionKey: "filterDeuteranopiaDesc",
      prevalenceKey:  "filterDeuteranopiaPrevalence",
      category:       "red_green",
      mode:           "simulation",
      matrix:         DEUTERANOPIA_SIM_MATRIX,
      svgFilter: function (intensity) {
        return buildFilterWithIntensity("deuteranopia_sim", DEUTERANOPIA_SIM_MATRIX, intensity);
      }
    },

    {
      id:             "deuteranomaly_sim",
      nameKey:        "filterDeuteranomalyName",
      descriptionKey: "filterDeuteranomalyDesc",
      prevalenceKey:  "filterDeuteranomalyPrevalence",
      category:       "red_green",
      mode:           "simulation",
      matrix:         DEUTERANOMALY_SIM_MATRIX,
      svgFilter: function (intensity) {
        return buildFilterWithIntensity("deuteranomaly_sim", DEUTERANOMALY_SIM_MATRIX, intensity);
      }
    },

    {
      id:             "tritanopia_sim",
      nameKey:        "filterTritanopiaName",
      descriptionKey: "filterTritanopiaDesc",
      prevalenceKey:  "filterTritanopiaPrevalence",
      category:       "blue_yellow",
      mode:           "simulation",
      matrix:         TRITANOPIA_SIM_MATRIX,
      svgFilter: function (intensity) {
        return buildFilterWithIntensity("tritanopia_sim", TRITANOPIA_SIM_MATRIX, intensity);
      }
    },

    {
      id:             "tritanomaly_sim",
      nameKey:        "filterTritanomalyName",
      descriptionKey: "filterTritanomalyDesc",
      prevalenceKey:  "filterTritanomalyPrevalence",
      category:       "blue_yellow",
      mode:           "simulation",
      matrix:         TRITANOMALY_SIM_MATRIX,
      svgFilter: function (intensity) {
        return buildFilterWithIntensity("tritanomaly_sim", TRITANOMALY_SIM_MATRIX, intensity);
      }
    },

    {
      id:             "achromatopsia_sim",
      nameKey:        "filterAchromatopsiaName",
      descriptionKey: "filterAchromatopsiaDesc",
      prevalenceKey:  "filterAchromatopsiaPrevalence",
      category:       "monochromacy",
      mode:           "simulation",
      matrix:         ACHROMATOPSIA_SIM_MATRIX,
      svgFilter: function (intensity) {
        return buildFilterWithIntensity("achromatopsia_sim", ACHROMATOPSIA_SIM_MATRIX, intensity);
      }
    },

    {
      id:             "achromatomaly_sim",
      nameKey:        "filterAchromatomalyName",
      descriptionKey: "filterAchromatomalyDesc",
      prevalenceKey:  "filterAchromatomalyPrevalence",
      category:       "monochromacy",
      mode:           "simulation",
      matrix:         ACHROMATOMALY_SIM_MATRIX,
      svgFilter: function (intensity) {
        return buildFilterWithIntensity("achromatomaly_sim", ACHROMATOMALY_SIM_MATRIX, intensity);
      }
    },

    {
      id:             "protanopia_correct",
      nameKey:        "filterProtanopiaCorrName",
      descriptionKey: "filterProtanopiaCorrDesc",
      prevalenceKey:  "filterProtanopiaCorrPrevalence",
      category:       "correction",
      mode:           "correction",
      svgFilter: function (intensity) {
        return buildDaltonizationFilter(
          "protanopia_correct",
          PROTANOPIA_SIM_MATRIX,
          PROTANOPIA_CORR_MATRIX,
          intensity
        );
      }
    },

    {
      id:             "deuteranopia_correct",
      nameKey:        "filterDeuteranopiaCorrName",
      descriptionKey: "filterDeuteranopiaCorrDesc",
      prevalenceKey:  "filterDeuteranopiaCorrPrevalence",
      category:       "correction",
      mode:           "correction",
      svgFilter: function (intensity) {
        return buildDaltonizationFilter(
          "deuteranopia_correct",
          DEUTERANOPIA_SIM_MATRIX,
          DEUTERANOPIA_CORR_MATRIX,
          intensity
        );
      }
    },

    {
      id:             "tritanopia_correct",
      nameKey:        "filterTritanopiaCorrName",
      descriptionKey: "filterTritanopiaCorrDesc",
      prevalenceKey:  "filterTritanopiaCorrPrevalence",
      category:       "correction",
      mode:           "correction",
      svgFilter: function (intensity) {
        return buildDaltonizationFilter(
          "tritanopia_correct",
          TRITANOPIA_SIM_MATRIX,
          TRITANOPIA_CORR_MATRIX,
          intensity
        );
      }
    },

    {
      id:             "high_contrast",
      nameKey:        "filterHighContrastName",
      descriptionKey: "filterHighContrastDesc",
      prevalenceKey:  "filterHighContrastPrevalence",
      category:       "correction",
      mode:           "correction",
      svgFilter: function (intensity) {
        return buildHighContrastFilter("high_contrast", intensity);
      }
    },

    {
      id:             "monochrome_contrast",
      nameKey:        "filterMonochromeContrastName",
      descriptionKey: "filterMonochromeContrastDesc",
      prevalenceKey:  "filterMonochromeContrastPrevalence",
      category:       "monochromacy",
      mode:           "correction",
      svgFilter: function (intensity) {
        return buildMonochromeContrastFilter("monochrome_contrast", intensity);
      }
    }

  ];

  global.CVD_FILTERS            = CVD_FILTERS;
  global.cvdInterpolateMatrix   = interpolateMatrix;
  global.cvdMatrixToString      = matrixToString;
  global.cvdBuildFilter         = buildFilter;

}(typeof window !== "undefined" ? window : this));
