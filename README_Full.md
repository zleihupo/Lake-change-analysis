# 🌍 Lake Change Analysis with Remote Sensing & Deep Learning

本项目用于 **湖泊变化分析（2000–2025）**：  
- 使用 **Google Earth Engine (GEE)** 下载遥感影像（Sentinel-2、Landsat、MODIS）和 **JRC Global Surface Water (GSW)** 掩膜  
- 导出 **湖泊面积、气候因子（温度、降水、蒸散、积雪）**  
- 使用 **深度学习模型 (U-Net, SegNet, FCN)** 进行湖泊分割  
- 结合 **机器学习与可解释性方法 (GBR, SHAP, PDP)** 分析湖泊与气候的关系  
- 最终生成湖泊趋势地图和论文配图  

---

## 📂 仓库结构

```
Lake-Change-Analysis/
│
├── gee_scripts/                          # Python 脚本：批量下载影像和掩膜
│   ├── check_the_lake_region.py          # 单湖影像可视化与合成
│   ├── choose_one_each_month.py          # 每月自动挑选最佳影像
│   ├── download_gsw_mask.py              # 导出 GSW 掩膜
│   └── download_lake_dataset.py          # 批量下载湖泊影像
│
├── gee_scripts/earthengine/              # GEE JavaScript 脚本 (Code Editor 运行)
│   ├── lake_area_gsw.js                  # 基于 GSW 的湖泊面积 (2000–2021)
│   ├── lake_area_s2_landsat.js           # S2 优先 + L7/L8/L9 备用的湖泊面积 (2000–2025)
│   ├── temperature_era5_gldas_merged.js  # ERA5 + GLDAS 的夏季温度 (2000–2025)
│   └── climate_era5_summer_units.js      # ERA5 夏季气候因子，单位统一
│
├── training/                             # 模型训练与评估
│   ├── train_all.py                      # U-Net / SegNet / FCN 训练
│   └── evaluate_lake.py                  # 模型评估 + Soft Voting 集成
│
├── analysis/                             # 数据分析
│   ├── analysis_with_ai.py               # GBR + SHAP/PDP 分析
│   └── check_data.py                     # 数据完整性检查
│
├── viz/                                  # 可视化脚本
│   ├── map.py                            # 交互地图 (folium)
│   └── plot.py                           # 论文配图批量生成
│
├── dataset/                              # 本地/云盘存放数据（不上传 GitHub）
│   ├── image/                            # 原始影像
│   ├── mask/                             # GSW 掩膜                       
│   └── models/                           # 训练好的模型权重
│
├── results/                      # 模型评估结果
│   ├── ensemble_heatmap.png
│   ├── model_vs_ensemble.png
│   ├── method_pipeline.png
│   ├── grid_search_ensemble_results.csv
│   │
│   ├── lake_climate/               # 湖泊-气候分析结果
│   │   ├── 100Lake_area_Temperature_2000-2025.csv
│   │   ├── Regional-Decade_Trend_Temperature_Area.csv
│   │   ├── GBR_Regional_Performance_(Summer).csv
│   │   ├── Permutation_Importance_(By_Region,_Summer).csv
│   │   ├── Top_3_Important_Features_by_Region_(Summer).csv
│   │   └── Feature_Directional_Index.csv
│   ├── figures/                    # 静态可视化图
│   │   ├── Fig2_sample_triptych.png
│   │   ├── Fig3_qualitative_comparison.png
│   │   ├── Fig6_global_trends.png
│   │   ├── Fig7_region_trends.png
│   │   ├── Fig8_region_small_multiples.png
│   │   └── Fig9_permutation_importance.png
│   └── maps/                         # 交互式地图 (HTML)
│       ├── region_trends_map.html
│       ├── global_heatmap_lakes_trends.html
│       └── lake_area_trend_with_climate.html
├── README.md
├── requirements.txt
└── .gitignore
```

---

## ⚙️ 环境安装

```bash
git clone https://github.com/<your-username>/Lake-change-analysis.git
cd Lake-change-analysis
pip install -r requirements.txt
```

- 需要 Python ≥ 3.9  
- 主要依赖：`earthengine-api`, `geemap`, `tensorflow`, `scikit-learn`, `shap`, `folium`, `matplotlib`  

---

## 📥 数据下载

由于数据体积较大（>100MB），未包含在仓库中。请从云盘下载并放置在 `data/` 目录下：

- 原始影像 `dataset/image/`：[下载链接](<你的云盘链接>)
- 掩膜数据 `dataset/mask/`：[下载链接](<你的云盘链接>)
- 模型权重 `dataset/models/`：[下载链接](<你的云盘链接>)

目录结构：
```
dataset/
├── imsge/
├── mask/
└── models/
```

---

## 🛰️ 使用 GEE 导出湖泊面积与气候数据

在 [Google Earth Engine Code Editor](https://code.earthengine.google.com/) 中运行以下脚本：

- `gee_scripts/earthengine/lake_area_gsw.js` → 基于 GSW 的夏季面积 (2000–2021)  
- `gee_scripts/earthengine/lake_area_s2_landsat.js` → S2 优先、Landsat 备用 (2000–2025)  
- `gee_scripts/earthengine/temperature_era5_gldas_merged.js` → ERA5 + GLDAS 夏季温度  
- `gee_scripts/earthengine/climate_era5_summer_units.js` → ERA5 夏季气候因子（降水/蒸散/积雪）  

运行后在 **Tasks 面板** 点击 **Run**，导出 CSV 到 Google Drive，然后下载到 `data/processed/`。

---

## 🧠 模型训练与评估

### 1. 训练
```bash
python training/train_all.py
```
- 自动划分数据集  
- 训练 U-Net / SegNet / FCN  
- 保存模型与指标  

### 2. 评估与集成
```bash
python training/evaluate_lake.py
```
- 计算 IoU / Dice / F1 / Precision / Recall  
- 网格搜索 Soft Voting 权重  
- 输出热力图和对比图  

---

## 📊 数据分析与可视化

### 1. 数据检查
```bash
python analysis/check_data.py
```
输出数据完整性报告与可疑年份。

### 2. 气候-湖泊关系分析
```bash
python analysis/analysis_with_ai.py
```
- 训练 GBR  
- SHAP / PDP 分析  
- 导出 Excel 报告  

### 3. 地图与图表
```bash
python viz/map.py
python viz/plot.py
```
生成交互地图（folium）和论文配图（Fig2, Fig3, Fig6–9 等）。
---

## 📈 模型评估结果

### 方法流程
![Pipeline](results/method_pipeline.png)

### 集成模型表现
- **F1 热力图**（Soft Voting 权重搜索）：  
  ![Ensemble Heatmap](results/ensemble_heatmap.png)

- **单模型 vs 集成模型对比**：  
  ![Model vs Ensemble](results/model_vs_ensemble.png)

### 详细结果表
见 [grid_search_ensemble_results.csv](results/grid_search_ensemble_results.csv)

## 🌡️ 湖泊面积与气候分析结果

### 时间序列
- [100Lake_area_Temperature_2000-2025.csv](results/lake_climate/100Lake_area_Temperature_2000-2025.csv)  
  包含 100 个湖泊在 2000–2025 年夏季的面积与气温序列。

### 区域趋势
- [Regional-Decade_Trend_Temperature_Area.csv](results/lake_climate/Regional-Decade_Trend_Temperature_Area.csv)  
  各区域的十年尺度趋势（温度 & 面积指数）。

### 模型表现
- [GBR_Regional_Performance_(Summer).csv](results/lake_climate/GBR_Regional_Performance_(Summer).csv)  
  区域级 Gradient Boosting 回归模型表现。

### 特征重要性
- [Permutation_Importance_(By_Region,_Summer).csv](results/lake_climate/Permutation_Importance_(By_Region,_Summer).csv)  
  按区域的气候特征重要性（置换法）。  
- [Top_3_Important_Features_by_Region_(Summer).csv](results/lake_climate/Top_3_Important_Features_by_Region_(Summer).csv)  
  每个区域最重要的 3 个气候变量。  
- [Feature_Directional_Index.csv](results/lake_climate/Feature_Directional_Index.csv)  
  特征方向性指标（相关性、SHAP、PDP slope）。

## 🌡️ 湖泊面积与气候分析结果

### 时间序列
- [100Lake_area_Temperature_2000-2025.csv](results/lake_climate/100Lake_area_Temperature_2000-2025.csv)  
  包含 100 个湖泊在 2000–2025 年夏季的面积与气温序列。

### 区域趋势
- [Regional-Decade_Trend_Temperature_Area.csv](results/lake_climate/Regional-Decade_Trend_Temperature_Area.csv)  
  各区域的十年尺度趋势（温度 & 面积指数）。

### 模型表现
- [GBR_Regional_Performance_(Summer).csv](results/lake_climate/GBR_Regional_Performance_(Summer).csv)  
  区域级 Gradient Boosting 回归模型表现。

### 特征重要性
- [Permutation_Importance_(By_Region,_Summer).csv](results/lake_climate/Permutation_Importance_(By_Region,_Summer).csv)  
  按区域的气候特征重要性（置换法）。  
- [Top_3_Important_Features_by_Region_(Summer).csv](results/lake_climate/Top_3_Important_Features_by_Region_(Summer).csv)  
  每个区域最重要的 3 个气候变量。  
- [Feature_Directional_Index.csv](results/lake_climate/Feature_Directional_Index.csv)  
  特征方向性指标（相关性、SHAP、PDP slope）。

## 🖼️ 论文可视化结果

### 数据与掩膜示例
- ![Fig2: 示例图](results/figures/Fig2_sample_triptych.png)

### 模型对比（定性）
- ![Fig3: 定性对比](results/figures/Fig3_qualitative_comparison.png)

### 全球与区域趋势
- ![Fig6: 全球趋势](results/figures/Fig6_global_trends.png)  
- ![Fig7: 区域趋势地图](results/figures/Fig7_region_trends.png)  
- ![Fig8: 区域时间序列](results/figures/Fig8_region_small_multiples.png)

### 特征重要性
- ![Fig9: 特征重要性](results/figures/Fig9_permutation_importance.png)

### 交互式地图
- [区域趋势地图 (region_trends_map.html)](results/maps/region_trends_map.html)
- [全球湖泊趋势热力图 (global_heatmap_lakes_trends.html)](results/maps/global_heatmap_lakes_trends.html)
- [湖泊面积与气候趋势 (lake_area_trend_with_climate.html)](results/maps/lake_area_trend_with_climate.html)


---

## 📜 License
MIT License

---

## ✨ Citation
如使用本仓库，请引用：
```
Lei, Z. (2025). Lake Change Analysis with Remote Sensing and Deep Learning. GitHub repository.
```
