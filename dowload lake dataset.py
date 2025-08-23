# ✅ 安装依赖
!pip install earthengine-api geemap -q

# ✅ 导入库
import ee, geemap
import datetime
import os
import pandas as pd
import shutil
from google.colab import files

# ✅ GEE 授权与初始化
ee.Authenticate()
ee.Initialize(project='lake-465014')  # 替换为你的项目 ID

# ✅ 参数设置：8 个湖泊（名字 + Rectangle）
lake_list = []


years = list(range(2000, 2025))
months = [6, 7, 8]

# ✅ 日期生成函数
def get_daily_dates(lat, base_year, base_month):
    if lat < 0:
        base_month = (base_month + 6 - 1) % 12 + 1
        if base_month < 6:
            base_year += 1
    start = datetime.date(base_year, base_month, 1)
    end = datetime.date(base_year + int(base_month == 12), (base_month % 12) + 1, 1)
    return [start + datetime.timedelta(days=i) for i in range((end - start).days)]

# ✅ 图像合成函数
def get_median_image(collection, bands, scale_factor):
    if collection.size().getInfo() == 0:
        return None
    return collection.median().select(bands).divide(scale_factor).multiply(255).clamp(0, 255).uint8()

# ✅ 主循环
all_results = []

for lake in lake_list:
    lake_name = lake["name"]
    region = lake["region"]
    base_folder = lake_name.replace(" ", "_")
    os.makedirs(base_folder, exist_ok=True)

    # 获取纬度中心
    coords = region.bounds().coordinates().getInfo()[0]
    lat_center = (coords[0][1] + coords[2][1]) / 2

    for year in years:
        for base_month in months:
            date_list = get_daily_dates(lat_center, year, base_month)
            if not date_list: continue

            actual_year = date_list[0].year
            actual_month = date_list[0].month
            month_folder = f"{base_folder}/{lake_name.replace(' ', '_')}-{str(actual_year)[-2:]}-{actual_month:02d}"
            os.makedirs(month_folder, exist_ok=True)

            for date in date_list:
                start = date.strftime("%Y-%m-%d")
                end = (date + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
                print(f"📅 {lake_name} — {start}")

                s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
                    .filterBounds(region).filterDate(start, end) \
                    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
                l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2") \
                    .filterBounds(region).filterDate(start, end) \
                    .filter(ee.Filter.lt('CLOUD_COVER', 60))
                mod = ee.ImageCollection("MODIS/006/MOD09GA") \
                    .filterBounds(region).filterDate(start, end)

                s2_img = get_median_image(s2, ['B4', 'B3', 'B2'], 3000)
                l8_img = get_median_image(l8, ['SR_B4', 'SR_B3', 'SR_B2'], 10000)
                mod_img = get_median_image(mod, ['sur_refl_b01', 'sur_refl_b04', 'sur_refl_b03'], 5000)

                fused = None
                if s2_img:
                    fused = s2_img
                    if l8_img: fused = fused.unmask(l8_img)
                    if mod_img: fused = fused.unmask(mod_img)
                elif l8_img:
                    fused = l8_img
                    if mod_img: fused = fused.unmask(mod_img)
                elif mod_img:
                    fused = mod_img

                if not fused:
                    all_results.append((lake_name, start, "⚠️ 无图像"))
                    continue

                tif_name = f"{lake_name.replace(' ', '_')}_{date.strftime('%Y_%m_%d')}.tif"
                tif_path = os.path.join(month_folder, tif_name)

                try:
                    geemap.download_ee_image(
                        image=fused,
                        filename=tif_path,
                        region=region,
                        scale=100,
                        crs='EPSG:4326'
                    )
                    all_results.append((lake_name, start, "✅ 成功"))
                except Exception as e:
                    all_results.append((lake_name, start, f"❌ 下载失败: {str(e)}"))

    # ✅ 打包当前湖泊 ZIP 并下载
    zip_name = f"{base_folder}.zip"
    shutil.make_archive(base_folder, 'zip', base_folder)
    files.download(zip_name)

# ✅ 下载总日志
df_result = pd.DataFrame(all_results, columns=["Lake", "Date", "Status"])
log_name = "multi_lake_download_log.csv"
df_result.to_csv(log_name, index=False)
print("\n✅ 下载完成，前10条日志如下：")
df_result.head(10)

print("\n✅ 所有湖泊处理完成 ✅")
