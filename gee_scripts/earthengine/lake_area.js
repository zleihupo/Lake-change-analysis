// GEE script: estimate annual lake surface area.
// Strategy: prefer cloud-masked optical NDWI (10-day samples within summer),
// fall back to seasonal median if insufficient samples, and finally to GSW MonthlyHistory.

// --- Cloud masking helpers ---
function maskS2Clouds(img) {
  // Mask S2 classes: cloud shadow(3), medium/high cloud(8/9), cirrus(10), snow(11)
  var scl = img.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(11));
  return img.updateMask(mask);
}

function maskLandsatClouds(img) {
  // Mask Landsat QA flags: cloud, shadow, snow
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0)   // cloud
              .and(qa.bitwiseAnd(1 << 4).eq(0))  // shadow
              .and(qa.bitwiseAnd(1 << 5).eq(0)); // snow
  return img.updateMask(mask);
}

// --- NDWI-based area (optical) ---
function computeNDWIArea(img, geom) {
  // NDWI = (green - nir) / (green + nir); threshold 0.25; area in m² via pixelArea
  var ndwi = img.expression('float((green - nir) / (green + nir + 1e-6))', {
    green: img.select('green'),
    nir: img.select('nir')
  }).rename('ndwi');
  var water = ndwi.gt(0.25).selfMask();
  return water.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: geom,
    scale: 30,
    maxPixels: 1e10
  }).get('ndwi');
}

// --- Lake inventory (replace with study sites as needed) ---
var lakes = [
  {name: 'Namtso', geom: ee.Geometry.Polygon([[[90.10, 30.20], [91.05, 30.20], [91.05, 31.10], [90.10, 31.10], [90.10, 30.20]]]), hemisphere: 'north'},
  {name: 'Yamdrok', geom: ee.Geometry.Polygon([[[90.3, 28.65], [91.1, 28.65], [91.1, 29.45], [90.3, 29.45], [90.3, 28.65]]]), hemisphere: 'north'},
  {name: 'Manasarovar', geom: ee.Geometry.Polygon([[[81.35, 30.4735], [81.683, 30.4735], [81.683, 30.8735], [81.35, 30.8735], [81.35, 30.4735]]]), hemisphere: 'north'},
  {name: 'Siling Lake', geom: ee.Geometry.Polygon([[[88.5, 31.4], [89.5, 31.4], [89.5, 32.2], [88.5, 32.2], [88.5, 31.4]]]), hemisphere: 'north'},
  {name: 'Gyaring Lake', geom: ee.Geometry.Polygon([[[97.03, 34.8], [97.52, 34.8], [97.52, 35.1], [97.03, 35.1], [97.03, 34.8]]]), hemisphere: 'north'},
  {name: 'Puma Yumco', geom: ee.Geometry.Polygon([[[90.20, 28.48], [90.55, 28.48], [90.55, 28.67], [90.20, 28.67], [90.20, 28.48]]]), hemisphere: 'north'},
  {name: 'Tangra Yumco', geom: ee.Geometry.Polygon([[[86.3, 30.7], [86.85, 30.7], [86.85, 31.4], [86.3, 31.4], [86.3, 30.7]]]), hemisphere: 'north'},
  {name: 'Zhari Namco', geom: ee.Geometry.Polygon([[[85.3, 30.7], [85.9, 30.7], [85.9, 31.1], [85.3, 31.1], [85.3, 30.7]]]), hemisphere: 'north'},
  {name: 'Qinghai Lake', geom: ee.Geometry.Polygon([[[99.5, 36.5], [100.9, 36.5], [100.9, 37.3], [99.5, 37.3], [99.5, 36.5]]]), hemisphere: 'north'},
  {name: 'Lake Rakshastal', geom: ee.Geometry.Polygon([[[81.1, 30.5], [81.35, 30.5], [81.35, 30.8735], [81.1, 30.8735], [81.1, 30.5]]]), hemisphere: 'north'},
  {name: 'Bosten Lake', geom: ee.Geometry.Polygon([[[86.6, 41.8], [87.44, 41.8], [87.44, 42.25], [86.6, 42.25], [86.6, 41.8]]]), hemisphere: 'north'},
  {name: 'Sayram Lake', geom: ee.Geometry.Polygon([[[80.9806, 44.4083], [81.3806, 44.4083], [81.3806, 44.8083], [80.9806, 44.8083], [80.9806, 44.4083]]]), hemisphere: 'north'},
  {name: 'Ebinur Lake', geom: ee.Geometry.Polygon([[[82.7, 44.6555], [83.1619, 44.6555], [83.1619, 45.0555], [82.7, 45.0555], [82.7, 44.6555]]]), hemisphere: 'north'},
  {name: 'Ailik Lake', geom: ee.Geometry.Polygon([[[85.7, 45.86], [85.9, 45.86], [85.9, 46.0], [85.7, 46.0], [85.7, 45.86]]]), hemisphere: 'north'},
  {name: 'Lake Barkol', geom: ee.Geometry.Polygon([[[92.6715, 43.5619], [92.8715, 43.5619], [92.8715, 43.7619], [92.6715, 43.7619], [92.6715, 43.5619]]]), hemisphere: 'north'},
  {name: 'Tianchi', geom: ee.Geometry.Polygon([[[88.11, 43.87], [88.15, 43.87], [88.15, 43.90], [88.11, 43.90], [88.11, 43.87]]]), hemisphere: 'north'},
  {name: 'Lake Ulungur', geom: ee.Geometry.Polygon([[[87.0126, 47.015], [87.6, 47.015], [87.6, 47.43], [87.0126, 47.43], [87.0126, 47.015]]]), hemisphere: 'north'},
  {name: 'Lake Ayakkum', geom: ee.Geometry.Polygon([[[89.05, 37.3323], [89.95, 37.3323], [89.95, 37.7323], [89.05, 37.7323], [89.05, 37.3323]]]), hemisphere: 'north'},
  {name: 'Lake Victoria', geom: ee.Geometry.Polygon([[[31.5, -3], [34.9, -3], [34.9, 0.7], [31.5, 0.7], [31.5, -3]]]), hemisphere: 'south'},
  {name: 'Lake Tanganyika', geom: ee.Geometry.Polygon([[[28.8, -9], [31.2, -9], [31.2, -3.2], [28.8, -3.2], [28.8, -9]]]), hemisphere: 'south'},
  {name: 'Lake Malawi', geom: ee.Geometry.Polygon([[[33.8016, -14.45], [35.31, -14.45], [35.31, -9.4606], [33.8016, -9.4606], [33.8016, -14.45]]]), hemisphere: 'south'},
  {name: 'Lake Albert', geom: ee.Geometry.Polygon([[[30.3, 1], [31.5, 1], [31.5, 2.7], [30.3, 2.7], [30.3, 1]]]), hemisphere: 'north'},
  {name: 'Lake Chad', geom: ee.Geometry.Polygon([[[13.7802, 12.77], [14.7802, 12.77], [14.7802, 13.28], [13.7802, 13.28], [13.7802, 12.77]]]), hemisphere: 'north'},
  {name: 'Lake Turkana', geom: ee.Geometry.Polygon([[[35.743, 2.3259], [36.743, 2.3259], [36.743, 4.7259], [35.743, 4.7259], [35.743, 2.3259]]]), hemisphere: 'north'},
  {name: 'Lake Kivu', geom: ee.Geometry.Polygon([[[28.8277, -2.5419], [29.4277, -2.5419], [29.4277, -1.4819], [28.8277, -1.4819], [28.8277, -2.5419]]]), hemisphere: 'south'},
  {name: 'Lake Edward', geom: ee.Geometry.Polygon([[[29.25, -0.7], [29.95, -0.7], [29.95, -0.04], [29.25, -0.04], [29.25, -0.7]]]), hemisphere: 'south'},
  {name: 'Lake Mweru', geom: ee.Geometry.Polygon([[[28.2422, -9.629], [29.2422, -9.629], [29.2422, -8.429], [28.2422, -8.429], [28.2422, -9.629]]]), hemisphere: 'south'},
  {name: 'Lake Rukwa', geom: ee.Geometry.Polygon([[[31.4553, -8.6651], [33.0553, -8.6651], [33.0553, -7.3651], [31.4553, -7.3651], [31.4553, -8.6651]]]), hemisphere: 'south'},
  {name: 'Lake Biwa', geom: ee.Geometry.Polygon([[[135.8226, 34.9686], [136.2826, 34.9686], [136.2826, 35.5186], [135.8226, 35.5186], [135.8226, 34.9686]]]), hemisphere: 'north'},
  {name: 'Poyang Lake', geom: ee.Geometry.Polygon([[[115.7546, 28.3859], [116.8046, 28.3859], [116.8046, 29.7859], [115.7546, 29.7859], [115.7546, 28.3859]]]), hemisphere: 'north'},
  {name: 'Dongting Lake', geom: ee.Geometry.Polygon([[[112.6968, 28.8147], [113.1968, 28.8147], [113.1968, 29.5647], [112.6968, 29.5647], [112.6968, 28.8147]]]), hemisphere: 'north'},
  {name: 'Taihu Lake', geom: ee.Geometry.Polygon([[[119.8417, 30.8889], [120.6817, 30.8889], [120.6817, 31.5489], [119.8417, 31.5489], [119.8417, 30.8889]]]), hemisphere: 'north'},
  {name: 'Hulun Lake', geom: ee.Geometry.Polygon([[[116.9006, 48.5489], [117.8006, 48.5489], [117.8006, 49.3889], [116.9006, 49.3889], [116.9006, 48.5489]]]), hemisphere: 'north'},
  {name: 'Chagan Lake', geom: ee.Geometry.Polygon([[[123.8383, 45.1325], [124.4483, 45.1325], [124.4483, 45.4625], [123.8383, 45.4625], [123.8383, 45.1325]]]), hemisphere: 'north'},
  {name: 'Dianchi Lake', geom: ee.Geometry.Polygon([[[102.519, 24.6467], [102.919, 24.6467], [102.919, 25.0467], [102.519, 25.0467], [102.519, 24.6467]]]), hemisphere: 'north'},
  {name: 'Erhai Lake', geom: ee.Geometry.Polygon([[[99.9811, 25.5831], [100.3811, 25.5831], [100.3811, 25.9831], [99.9811, 25.9831], [99.9811, 25.5831]]]), hemisphere: 'north'},
  {name: 'Hongze Lake', geom: ee.Geometry.Polygon([[[118.1472, 33.0555], [118.8972, 33.0555], [118.8972, 33.7555], [118.1472, 33.7555], [118.1472, 33.0555]]]), hemisphere: 'north'},
  {name: 'Nansi Lake', geom: ee.Geometry.Polygon([[[116.5545, 34.3802], [117.4545, 34.3802], [117.4545, 35.3802], [116.5545, 35.3802], [116.5545, 34.3802]]]), hemisphere: 'north'},
  {name: 'Lake Balkhash', geom: ee.Geometry.Polygon([[[73.407, 44.8], [79.337, 44.8], [79.337, 46.8566], [73.407, 46.8566], [73.407, 44.8]]]), hemisphere: 'north'},
  {name: 'Issyk-Kul', geom: ee.Geometry.Polygon([[[76.1001, 42.0833], [78.4001, 42.0833], [78.4001, 42.7833], [76.1001, 42.7833], [76.1001, 42.0833]]]), hemisphere: 'north'},
  {name: 'Lake Zaysan', geom: ee.Geometry.Polygon([[[82.8455, 47.588], [84.8455, 47.588], [84.8455, 48.388], [82.8455, 48.388], [82.8455, 47.588]]]), hemisphere: 'north'},
  {name: 'Lake Sasykkol', geom: ee.Geometry.Polygon([[[80.58, 46.35], [81.38, 46.35], [81.38, 46.7066], [80.58, 46.7066], [80.58, 46.35]]]), hemisphere: 'north'},
  {name: 'Lake Alakol', geom: ee.Geometry.Polygon([[[81.18, 45.65], [82.2, 45.65], [82.2, 46.5266], [81.18, 46.5266], [81.18, 45.65]]]), hemisphere: 'north'},
  {name: 'Iskanderkul', geom: ee.Geometry.Polygon([[[68.34, 39.08], [68.39, 39.08], [68.39, 39.09], [68.34, 39.09], [68.34, 39.08]]]), hemisphere: 'north'},
  {name: 'Aydar Lake', geom: ee.Geometry.Polygon([[[65.8, 40.4162], [68.1, 40.4162], [68.1, 41.1162], [65.8, 41.1162], [65.8, 40.4162]]]), hemisphere: 'north'},
  {name: 'Lake Tengiz', geom: ee.Geometry.Polygon([[[68.6101, 50.13], [69.8101, 50.13], [69.8101, 50.72], [68.6101, 50.72], [68.6101, 50.13]]]), hemisphere: 'north'},
  {name: 'Lake Markakol', geom: ee.Geometry.Polygon([[[85.5, 48.65], [86.1, 48.65], [86.1, 48.85], [85.5, 48.85], [85.5, 48.65]]]), hemisphere: 'north'},
  {name: 'Aral Sea', geom: ee.Geometry.Polygon([[[58.17, 44.18], [61.6, 44.18], [61.6, 46.8], [58.17, 46.8], [58.17, 44.18]]]), hemisphere: 'north'},
  {name: 'Lake Geneva', geom: ee.Geometry.Polygon([[[6.1, 46.19], [7, 46.19], [7, 46.55], [6.1, 46.55], [6.1, 46.19]]]), hemisphere: 'north'},
  {name: 'Lake Constance', geom: ee.Geometry.Polygon([[[8.85, 47.47], [9.79, 47.47], [9.79, 47.85], [8.85, 47.85], [8.85, 47.47]]]), hemisphere: 'north'},
  {name: 'Lake Ladoga', geom: ee.Geometry.Polygon([[[29.62, 59.89], [33.2, 59.89], [33.2, 61.74], [29.62, 61.74], [29.62, 59.89]]]), hemisphere: 'north'},
  {name: 'Lake Onega', geom: ee.Geometry.Polygon([[[33.62, 60.8], [36.63, 60.8], [36.63, 62.98], [33.62, 62.98], [33.62, 60.8]]]), hemisphere: 'north'},
  {name: 'Lake Neusiedl', geom: ee.Geometry.Polygon([[[16.68, 47.65], [16.87, 47.65], [16.87, 47.94], [16.68, 47.94], [16.68, 47.65]]]), hemisphere: 'north'},
  {name: 'Lake Vänern', geom: ee.Geometry.Polygon([[[12.26, 58.32], [14.15, 58.32], [14.15, 59.43], [12.26, 59.43], [12.26, 58.32]]]), hemisphere: 'north'},
  {name: 'Lake Vättern', geom: ee.Geometry.Polygon([[[14.04, 57.75], [15, 57.75], [15, 58.84], [14.04, 58.84], [14.04, 57.75]]]), hemisphere: 'north'},
  {name: 'Loch Ness', geom: ee.Geometry.Polygon([[[-4.70, 57.13], [-4.27, 57.13], [-4.27, 57.43], [-4.70, 57.43], [-4.70, 57.13]]]), hemisphere: 'north'},
  {name: 'Lake Windermere', geom: ee.Geometry.Polygon([[[-2.98, 54.27], [-2.91, 54.27], [-2.91, 54.42], [-2.98, 54.42], [-2.98, 54.27]]]), hemisphere: 'north'},
  {name: 'Lake Maggiore', geom: ee.Geometry.Polygon([[[8.49, 45.72], [8.86, 45.72], [8.86, 46.19], [8.49, 46.19], [8.49, 45.72]]]), hemisphere: 'north'},
  {name: 'Lago Janauacá', geom: ee.Geometry.Polygon([[[-60.37, -3.44], [-60.23, -3.44], [-60.23, -3.32], [-60.37, -3.32], [-60.37, -3.44]]]), hemisphere: 'south'},
  {name: 'Lago Mirauá', geom: ee.Geometry.Polygon([[[-60.6, -3.66], [-60.44, -3.66], [-60.44, -3.44], [-60.6, -3.44], [-60.6, -3.66]]]), hemisphere: 'south'},
  {name: 'Lake Ayapuá', geom: ee.Geometry.Polygon([[[-62.44, -4.59], [-62.06, -4.59], [-62.06, -4.34], [-62.44, -4.34], [-62.44, -4.59]]]), hemisphere: 'south'},
  {name: 'Lake Amanã', geom: ee.Geometry.Polygon([[[-64.84, -2.76], [-64.39, -2.76], [-64.39, -2.36], [-64.84, -2.36], [-64.84, -2.76]]]), hemisphere: 'south'},
  {name: 'Lago Tefé', geom: ee.Geometry.Polygon([[[-65.04, -3.70], [-64.68, -3.70], [-64.68, -3.26], [-65.04, -3.26], [-65.04, -3.70]]]), hemisphere: 'south'},
  {name: 'Lago Grande de Curuai', geom: ee.Geometry.Polygon([[[-55.51, -2.32], [-54.93, -2.32], [-54.93, -1.99], [-55.51, -1.99], [-55.51, -2.32]]]), hemisphere: 'south'},
  {name: 'Lago do Arari', geom: ee.Geometry.Polygon([[[-57.23, -2.53], [-57.17, -2.53], [-57.17, -2.49], [-57.23, -2.49], [-57.23, -2.53]]]), hemisphere: 'south'},
  {name: 'Lago Mamori', geom: ee.Geometry.Polygon([[[-60.17, -3.66], [-60.00, -3.66], [-60.00, -3.56], [-60.17, -3.56], [-60.17, -3.66]]]), hemisphere: 'south'},
  {name: 'Sebkha el Melah', geom: ee.Geometry.Polygon([[[-1.40, 29.08], [-1.10, 29.08], [-1.10, 29.34], [-1.40, 29.34], [-1.40, 29.08]]]), hemisphere: 'north'},
  {name: 'Chott el Djerid', geom: ee.Geometry.Polygon([[[7.75, 33.33], [8.88, 33.33], [8.88, 34.09], [7.75, 34.09], [7.75, 33.33]]]), hemisphere: 'north'},
  {name: 'Lake Bodélé', geom: ee.Geometry.Polygon([[[16.99, 16.55], [18.89, 16.55], [18.89, 17.36], [16.99, 17.36], [16.99, 16.55]]]), hemisphere: 'north'},
  {name: 'Sebkha Sidi El Hani', geom: ee.Geometry.Polygon([[[10.27, 35.37], [10.62, 35.37], [10.62, 35.66], [10.27, 35.66], [10.27, 35.37]]]), hemisphere: 'north'},
  {name: 'Sebkha de Timimoun', geom: ee.Geometry.Polygon([[[-0.1, 28.90], [0.17, 28.90], [0.17, 29.15], [-0.1, 29.15], [-0.1, 28.90]]]), hemisphere: 'north'},
  {name: 'Lake Yoa', geom: ee.Geometry.Polygon([[[20.49, 19.04], [20.52, 19.04], [20.52, 19.075], [20.49, 19.075], [20.49, 19.04]]]), hemisphere: 'north'},
  {name: 'Lake Katam', geom: ee.Geometry.Polygon([[[20.5, 19.0], [20.55, 19.0], [20.55, 19.03], [20.5, 19.03], [20.5, 19.0]]]), hemisphere: 'north'},
  {name: 'Lake Ounianga Serir', geom: ee.Geometry.Polygon([[[20.85, 18.91], [20.90, 18.91], [20.90, 18.96], [20.85, 18.96], [20.85, 18.91]]]), hemisphere: 'north'},
  {name: 'Lake Baikal', geom: ee.Geometry.Polygon([[[103.53, 51.38], [110.18, 51.38], [110.18, 56.09], [103.53, 56.09], [103.53, 51.38]]]), hemisphere: 'north'},
  {name: 'Lake Khanka', geom: ee.Geometry.Polygon([[[131.87, 44.52], [132.86, 44.52], [132.86, 45.39], [131.87, 45.39], [131.87, 44.52]]]), hemisphere: 'north'},
  {name: 'Lake Taimyr', geom: ee.Geometry.Polygon([[[99.06, 73.80], [105.80, 73.80], [105.80, 75.26], [99.06, 75.26], [99.06, 73.80]]]), hemisphere: 'north'},
  {name: 'Lake Chany', geom: ee.Geometry.Polygon([[[77.3, 54.57], [78.11, 54.57], [78.11, 55.09], [77.3, 55.09], [77.3, 54.57]]]), hemisphere: 'north'},
  {name: 'Lake Bustakh', geom: ee.Geometry.Polygon([[[141.59, 72.43], [142.36, 72.43], [142.36, 72.62], [141.59, 72.62], [141.59, 72.43]]]), hemisphere: 'north'},
  {name: 'Lake Labynkyr', geom: ee.Geometry.Polygon([[[143.55, 62.28], [143.68, 62.28], [143.68, 62.57], [143.55, 62.57], [143.55, 62.28]]]), hemisphere: 'north'},
  {name: 'Lake Pekulney', geom: ee.Geometry.Polygon([[[176.86, 62.55], [177.57, 62.55], [177.57, 62.88], [176.86, 62.88], [176.86, 62.55]]]), hemisphere: 'north'},
  {name: 'Lake Uvs', geom: ee.Geometry.Polygon([[[92.16, 49.95], [93.75, 49.95], [93.75, 50.71], [92.16, 50.71], [92.16, 49.95]]]), hemisphere: 'north'},
  {name: 'Lake Ozhogino', geom: ee.Geometry.Polygon([[[146.38, 69.05], [146.93, 69.05], [146.93, 69.32], [146.38, 69.32], [146.38, 69.05]]]), hemisphere: 'north'},
  {name: 'Lake Yessey', geom: ee.Geometry.Polygon([[[102.09, 68.31], [102.66, 68.31], [102.66, 68.55], [102.09, 68.55], [102.09, 68.31]]]), hemisphere: 'north'},
  {name: 'Supraglacial Lakes', geom: ee.Geometry.Polygon([[[-52.04, 67.11], [-51.70, 67.11], [-51.70, 67.20], [-52.04, 67.20], [-52.04, 67.11]]]), hemisphere: 'north'},
  {name: 'Lake Ilulissat', geom: ee.Geometry.Polygon([[[-51.09, 69.221], [-51.07, 69.221], [-51.07, 69.227], [-51.09, 69.227], [-51.09, 69.221]]]), hemisphere: 'north'},
  {name: 'Lake Amitsup Tasia', geom: ee.Geometry.Polygon([[[-50.50, 70.06], [-50.37, 70.06], [-50.37, 70.14], [-50.50, 70.14], [-50.50, 70.06]]]), hemisphere: 'north'},
  {name: 'Lake Sanningasoq', geom: ee.Geometry.Polygon([[[-50.67, 67.05], [-50.47, 67.05], [-50.47, 67.10], [-50.67, 67.10], [-50.67, 67.05]]]), hemisphere: 'north'},
  {name: 'Lake Aajuitsup Tasia', geom: ee.Geometry.Polygon([[[-50.50, 67.07], [-50.29, 67.07], [-50.29, 67.11], [-50.50, 67.11], [-50.50, 67.07]]]), hemisphere: 'north'},
  {name: 'Lake Ferguson', geom: ee.Geometry.Polygon([[[-50.71, 66.95], [-50.57, 66.95], [-50.57, 66.99], [-50.71, 66.99], [-50.71, 66.95]]]), hemisphere: 'north'},
  {name: 'Lake Tasersuaq', geom: ee.Geometry.Polygon([[[-52.18, 66.96], [-51.47, 66.96], [-51.47, 67.06], [-52.18, 67.06], [-52.18, 66.96]]]), hemisphere: 'north'},
  {name: 'Lake Eyre', geom: ee.Geometry.Polygon([[[136.64, -29.53], [138.09, -29.53], [138.09, -27.79], [136.64, -27.79], [136.64, -29.53]]]), hemisphere: 'south'},
  {name: 'Lake Torrens', geom: ee.Geometry.Polygon([[[137.07, -31.98], [138.18, -31.98], [138.18, -30.12], [137.07, -30.12], [137.07, -31.98]]]), hemisphere: 'south'},
  {name: 'Lake Gairdner', geom: ee.Geometry.Polygon([[[135.31, -32.38], [136.36, -32.38], [136.36, -31.00], [135.31, -31.00], [135.31, -32.38]]]), hemisphere: 'south'},
  {name: 'Lake Frome', geom: ee.Geometry.Polygon([[[139.49, -31.16], [140.09, -31.16], [140.09, -30.21], [139.49, -30.21], [139.49, -31.16]]]), hemisphere: 'south'},
  {name: 'Lake Amadeus', geom: ee.Geometry.Polygon([[[130.34, -25.00], [131.51, -25.00], [131.51, -24.46], [130.34, -24.46], [130.34, -25.00]]]), hemisphere: 'south'},
  {name: 'Lake Disappointment', geom: ee.Geometry.Polygon([[[122.55, -23.71], [123.24, -23.71], [123.24, -23.18], [122.55, -23.18], [122.55, -23.71]]]), hemisphere: 'south'},
  {name: 'Lake Carnegie', geom: ee.Geometry.Polygon([[[121.92, -26.60], [123.23, -26.60], [123.23, -25.94], [121.92, -25.94], [121.92, -26.60]]]), hemisphere: 'south'},
  {name: 'Lake Mackay', geom: ee.Geometry.Polygon([[[128.23, -22.70], [129.29, -22.70], [129.29, -21.97], [128.23, -21.97], [128.23, -22.70]]]), hemisphere: 'south'},
  {name: 'Lake Gregory', geom: ee.Geometry.Polygon([[[127.24, -20.31], [127.53, -20.31], [127.53, -20.06], [127.24, -20.06], [127.24, -20.31]]]), hemisphere: 'south'}
];

// --- Annual processing per lake ---
var years = ee.List.sequence(2000, 2025);
var features = [];

lakes.forEach(function(lake) {
  var geom = lake.geom;
  var name = lake.name;
  var hemi = lake.hemisphere;

  var yearFeatures = years.map(function(y) {
    var year = ee.Number(y);
    // Summer anchor month (Dec for south; Jun for north); sample every ~10 days
    var summerStart = ee.Date.fromYMD(year, hemi === 'south' ? 12 : 6, 1);
    var days = ee.List.sequence(0, 89, 9);
    var dates = days.map(function(d) { return summerStart.advance(d, 'day'); });

    // NDWI areas from rolling 11-day windows centred on the sample date
    var areas = dates.map(function(date) {
      date = ee.Date(date);
      var wstart = date.advance(-5, 'day');
      var wend = date.advance(6, 'day');

      // Sentinel-2 (preferred): cloud-filtered, band remap to blue/green/red/nir
      var s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(geom).filterDate(wstart, wend)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
        .map(maskS2Clouds)
        .map(function(img) {
          return img.select(['B2','B3','B4','B8','SCL'], ['blue','green','red','nir','SCL']);
        })
        .sort('CLOUDY_PIXEL_PERCENTAGE');
      var s2img = ee.Image(s2.first());

      // Landsat (backup): scale to reflectance, handle L5/7 vs L8/9 band names
      var ls = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
        .merge(ee.ImageCollection("LANDSAT/LE07/C02/T1_L2"))
        .merge(ee.ImageCollection("LANDSAT/LC08/C02/T1_L2"))
        .merge(ee.ImageCollection("LANDSAT/LC09/C02/T1_L2"))
        .filterBounds(geom).filterDate(wstart, wend)
        .filter(ee.Filter.lt('CLOUD_COVER', 70))
        .map(maskLandsatClouds)
        .map(function(img) {
          var scaled = img.multiply(0.0000275).add(-0.2);
          var sc = ee.String(img.get('SPACECRAFT_ID'));
          var isL7 = sc.compareTo('LANDSAT_7').eq(0);
          var isL5 = sc.compareTo('LANDSAT_5').eq(0);
          var isL57 = isL5.or(isL7);
          var blue  = ee.Algorithms.If(isL57, 'SR_B1', 'SR_B2');
          var green = ee.Algorithms.If(isL57, 'SR_B2', 'SR_B3');
          var red   = ee.Algorithms.If(isL57, 'SR_B3', 'SR_B4');
          var nir   = ee.Algorithms.If(isL57, 'SR_B4', 'SR_B5');
          return scaled.select([blue, green, red, nir], ['blue','green','red','nir'])
                       .copyProperties(img, ['system:time_start']);
        })
        .sort('CLOUD_COVER');
      var lsimg = ee.Image(ls.first());

      var img = ee.Algorithms.If(s2img, s2img, lsimg);
      return ee.Algorithms.If(img, computeNDWIArea(ee.Image(img), geom), null);
    });

    // Prefer the 10-day mean if any valid samples exist; otherwise compute seasonal fallback
    var validAreas = ee.List(areas).removeAll([null]);
    var minDays = 3; // retained for clarity (threshold can be applied if desired)
    var tenDayMean = ee.Number(validAreas.reduce(ee.Reducer.mean()));

    var fallback = (function() {
      // Seasonal median (3-month window) with same band mapping as above
      var start = summerStart;
      var end = summerStart.advance(3, 'month');
      var s2s = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(geom).filterDate(start, end)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
        .map(maskS2Clouds)
        .map(function(img){ return img.select(['B2','B3','B4','B8'],['blue','green','red','nir']); });
      var lss = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
        .merge(ee.ImageCollection("LANDSAT/LE07/C02/T1_L2"))
        .merge(ee.ImageCollection("LANDSAT/LC08/C02/T1_L2"))
        .merge(ee.ImageCollection("LANDSAT/LC09/C02/T1_L2"))
        .filterBounds(geom).filterDate(start, end)
        .filter(ee.Filter.lt('CLOUD_COVER', 70))
        .map(maskLandsatClouds)
        .map(function(img) {
          var scaled = img.multiply(0.0000275).add(-0.2);
          var sc = ee.String(img.get('SPACECRAFT_ID'));
          var isL7 = sc.compareTo('LANDSAT_7').eq(0);
          var isL5 = sc.compareTo('LANDSAT_5').eq(0);
          var isL57 = isL5.or(isL7);
          var blue  = ee.Algorithms.If(isL57, 'SR_B1', 'SR_B2');
          var green = ee.Algorithms.If(isL57, 'SR_B2', 'SR_B3');
          var red   = ee.Algorithms.If(isL57, 'SR_B3', 'SR_B4');
          var nir   = ee.Algorithms.If(isL57, 'SR_B4', 'SR_B5');
          return scaled.select([blue,green,red,nir], ['blue','green','red','nir'])
                       .copyProperties(img, ['system:time_start']);
        });
      var median = ee.Image(ee.Algorithms.If(s2s.size().gt(0), s2s.median(), lss.median()));
      return ee.Algorithms.If(median, computeNDWIArea(median, geom), null);
    })();

    // Final backup: GSW MonthlyHistory seasonal mean over summer months
    var gswFallback = (function() {
      var summerMonths = hemi === 'south' ? [12, 1, 2] : [6, 7, 8];
      var start = ee.Date.fromYMD(year, hemi === 'south' ? 12 : 6, 1);
      var end   = start.advance(3, 'month');

      var gswFC = ee.ImageCollection("JRC/GSW1_4/MonthlyHistory")
        .filterBounds(geom)
        .filterDate(start, end)
        .filter(ee.Filter.inList('month', summerMonths))
        .map(function(img) {
          var water = img.eq(2).rename('water');
          var area = water.multiply(ee.Image.pixelArea()).reduceRegion({
            reducer: ee.Reducer.sum(),
            geometry: geom,
            scale: 30,
            maxPixels: 1e9
          }).get('water');
          return ee.Feature(null, {area: area});
        });

      return ee.Algorithms.If(gswFC.size().gt(0),
        ee.Number(gswFC.aggregate_mean('area')),
        null
      );
    })();

    var finalArea = ee.Algorithms.If(
      validAreas.length().gt(0),
      tenDayMean,
      gswFallback
    );

    var source = ee.String(
      ee.Algorithms.If(validAreas.length().gt(0), '10day-mean', 'GSW-fallback')
    );

    return ee.Feature(null, {
      lake: name,
      year: year,
      area_m2: finalArea,
      valid_days: validAreas.length(),
      source: source
    });
  });

  var fc = ee.FeatureCollection(yearFeatures);
  features = features.concat(fc.toList(fc.size()));
});

// Assemble and export results as CSV to Drive
var result = ee.FeatureCollection(ee.List(features).flatten());
Export.table.toDrive({
  collection: result,
  description: 'LakeArea_AllYears_Full',
  fileFormat: 'CSV'
});
