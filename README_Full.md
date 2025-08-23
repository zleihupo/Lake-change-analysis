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
├── data/                                 # 本地/云盘存放数据（不上传 GitHub）
│   ├── raw/                              # 原始影像
│   ├── mask/                             # GSW 掩膜
│   ├── processed/                        # 处理后的 CSV/PNG
│   └── models/                           # 训练好的模型权重
│
├── results/                              # 模型输出与关键图表
├── notebooks/                            # 可选：Jupyter 实验记录
│
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

- 原始影像 `data/raw/`：[下载链接](<你的云盘链接>)
- 掩膜数据 `data/mask/`：[下载链接](<你的云盘链接>)
- 处理后 CSV/PNG `data/processed/`：[下载链接](<你的云盘链接>)
- 模型权重 `data/models/`：[下载链接](<你的云盘链接>)

目录结构：
```
data/
├── raw/
├── mask/
├── processed/
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

## 📜 License
MIT License

---

## ✨ Citation
如使用本仓库，请引用：
```
Lei, Z. (2025). Lake Change Analysis with Remote Sensing and Deep Learning. GitHub repository.
```
