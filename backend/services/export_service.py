"""
导出服务 - 将SVG动画转换为MP4视频和GIF
使用 Playwright 无头浏览器渲染真实的 SVG 动画
支持进度回调
支持透明背景GIF导出
"""
import os
import io
import re
import tempfile
import asyncio
import logging
from PIL import Image

logger = logging.getLogger(__name__)

class ExportService:
    def __init__(self):
        self.temp_dir = tempfile.gettempdir()
    
    def _detect_transparent_background(self, svg_content):
        """检测SVG是否使用透明背景"""
        svg_lower = svg_content.lower()
        
        # 1. 检查是否有 fill="transparent" 的背景矩形
        # AI生成的SVG通常有 <rect width="800" height="600" fill="transparent"/>
        if re.search(r'<rect[^>]*fill\s*=\s*["\']transparent["\']', svg_content, re.IGNORECASE):
            logger.info("检测到 fill='transparent' 的矩形，判定为透明背景")
            return True
        
        # 2. 检查是否有 fill="none" 的全尺寸背景矩形
        if re.search(r'<rect[^>]*fill\s*=\s*["\']none["\']', svg_content, re.IGNORECASE):
            logger.info("检测到 fill='none' 的矩形，判定为透明背景")
            return True
        
        # 3. 检查SVG的style属性中是否有transparent
        if re.search(r'background(-color)?:\s*transparent', svg_content, re.IGNORECASE):
            logger.info("检测到 background: transparent 样式，判定为透明背景")
            return True
        
        # 4. 检查是否有 background: none
        if re.search(r'background(-color)?:\s*none', svg_content, re.IGNORECASE):
            logger.info("检测到 background: none 样式，判定为透明背景")
            return True
        
        # 5. 检查SVG标签中是否有 style 包含 transparent
        svg_tag_match = re.search(r'<svg[^>]*>', svg_content, re.IGNORECASE)
        if svg_tag_match:
            svg_tag = svg_tag_match.group(0)
            if 'transparent' in svg_tag.lower():
                logger.info("检测到 SVG 标签包含 transparent，判定为透明背景")
                return True
        
        # 6. 检查是否没有任何背景矩形（可能是透明的）
        # 查找覆盖整个画布的背景矩形
        has_bg_rect = re.search(
            r'<rect[^>]*(?:width\s*=\s*["\'](?:800|100%)["\'])[^>]*(?:height\s*=\s*["\'](?:600|100%)["\'])[^>]*fill\s*=\s*["\']#[0-9a-fA-F]{3,8}["\']',
            svg_content, re.IGNORECASE
        )
        if not has_bg_rect:
            # 也检查另一种顺序
            has_bg_rect = re.search(
                r'<rect[^>]*fill\s*=\s*["\']#[0-9a-fA-F]{3,8}["\'][^>]*(?:width\s*=\s*["\'](?:800|100%)["\'])',
                svg_content, re.IGNORECASE
            )
        
        logger.info(f"透明背景检测结果: has_bg_rect={has_bg_rect is not None}")
        return False
    
    async def _capture_animation_frames_async(self, svg_content, duration=3, fps=10, width=800, height=600, on_progress=None, transparent=False):
        """使用 Playwright 捕获 SVG 动画帧"""
        frames = []
        total_frames = int(duration * fps)
        frame_interval = 1000 / fps
        
        playwright = None
        browser = None
        page = None
        
        try:
            from playwright.async_api import async_playwright
            
            logger.info(f"开始捕获动画帧: duration={duration}s, fps={fps}, total_frames={total_frames}, transparent={transparent}")
            
            if on_progress:
                on_progress(5, "正在启动浏览器...")
            
            playwright = await async_playwright().start()
            
            # 启动浏览器，添加更多参数以支持无头服务器环境
            browser = await playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--single-process',  # 在某些环境下需要
                ]
            )
            
            logger.info("✅ Playwright 浏览器启动成功")
            
            page = await browser.new_page(viewport={'width': width, 'height': height})
            
            if on_progress:
                on_progress(10, "正在加载动画...")
            
            # 根据是否透明设置背景
            bg_style = 'transparent' if transparent else '#0f172a'
            
            html_content = f'''
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                    html, body {{ 
                        background: {bg_style}; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center;
                        width: {width}px;
                        height: {height}px;
                        overflow: hidden;
                    }}
                    .svg-container {{
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: {bg_style};
                    }}
                    .svg-container svg {{
                        max-width: 100%;
                        max-height: 100%;
                        width: auto;
                        height: auto;
                    }}
                </style>
            </head>
            <body>
                <div class="svg-container">
                    {svg_content}
                </div>
            </body>
            </html>
            '''
            
            await page.set_content(html_content)
            await page.wait_for_timeout(200)
            
            # 捕获帧 - 进度从 15% 到 85%
            for i in range(total_frames):
                # 如果需要透明背景，使用omit_background参数
                if transparent:
                    screenshot = await page.screenshot(type='png', omit_background=True)
                else:
                    screenshot = await page.screenshot(type='png')
                    
                image = Image.open(io.BytesIO(screenshot))
                
                # 根据是否透明选择转换模式
                if transparent:
                    frames.append(image.convert('RGBA'))
                else:
                    frames.append(image.convert('RGB'))
                
                if i < total_frames - 1:
                    await page.wait_for_timeout(int(frame_interval))
                
                # 更新进度
                if on_progress:
                    progress = 15 + int((i + 1) / total_frames * 70)
                    on_progress(progress, f"正在捕获帧 {i + 1}/{total_frames}")
            
            logger.info(f"帧捕获完成，共 {len(frames)} 帧")
            
        except ImportError as e:
            logger.error(f"❌ Playwright 未安装: {e}")
            logger.error("请运行: pip install playwright && playwright install chromium")
            if on_progress:
                on_progress(15, "Playwright未安装，使用备用方案...")
            frames = self._create_static_frames(svg_content, total_frames, width, height, transparent)
        except Exception as e:
            logger.error(f"❌ Playwright 捕获失败: {e}")
            logger.error(f"错误类型: {type(e).__name__}")
            import traceback
            logger.error(f"详细错误: {traceback.format_exc()}")
            
            # 检查是否是浏览器启动问题
            error_str = str(e).lower()
            if 'browser' in error_str or 'chromium' in error_str or 'executable' in error_str:
                logger.error("💡 提示: 可能需要安装浏览器依赖")
                logger.error("   Ubuntu: sudo ./install_playwright.sh")
                logger.error("   或运行: playwright install --with-deps chromium")
            
            if on_progress:
                on_progress(15, "浏览器启动失败，使用备用方案...")
            frames = self._create_static_frames(svg_content, total_frames, width, height, transparent)
        finally:
            if page:
                try:
                    await page.close()
                except:
                    pass
            if browser:
                try:
                    await browser.close()
                except:
                    pass
            if playwright:
                try:
                    await playwright.stop()
                except:
                    pass
        
        return frames
    
    def _create_static_frames(self, svg_content, total_frames, width, height, transparent=False):
        """创建静态帧（备用方案）"""
        import math
        from PIL import ImageEnhance
        
        frames = []
        base_image = self._render_svg_simple(svg_content, width, height, transparent)
        
        for i in range(total_frames):
            frame = base_image.copy()
            progress = i / max(total_frames - 1, 1)
            pulse = 0.9 + 0.1 * math.sin(progress * math.pi * 4)
            enhancer = ImageEnhance.Brightness(frame)
            frame = enhancer.enhance(pulse)
            frames.append(frame)
        
        return frames
    
    def _render_svg_simple(self, svg_content, width, height, transparent=False):
        """简单的 SVG 渲染（备用）"""
        from PIL import ImageDraw
        
        if transparent:
            image = Image.new('RGBA', (width, height), color=(0, 0, 0, 0))
        else:
            image = Image.new('RGB', (width, height), color='#0f172a')
        draw = ImageDraw.Draw(image)
        
        for match in re.finditer(r'<circle[^>]*?cx=["\']?([0-9.]+)["\']?[^>]*?cy=["\']?([0-9.]+)["\']?[^>]*?r=["\']?([0-9.]+)["\']?', svg_content):
            cx, cy, r = float(match.group(1)), float(match.group(2)), float(match.group(3))
            scale = min(width, height) / 800
            cx, cy, r = cx * scale, cy * scale, r * scale
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline='#60a5fa', width=2)
        
        for match in re.finditer(r'<rect[^>]*?x=["\']?([0-9.]+)["\']?[^>]*?y=["\']?([0-9.]+)["\']?[^>]*?width=["\']?([0-9.]+)["\']?[^>]*?height=["\']?([0-9.]+)["\']?', svg_content):
            x, y, w, h = float(match.group(1)), float(match.group(2)), float(match.group(3)), float(match.group(4))
            scale = min(width, height) / 800
            x, y, w, h = x * scale, y * scale, w * scale, h * scale
            draw.rectangle([x, y, x+w, y+h], outline='#34d399', width=2)
        
        if not re.search(r'<(circle|rect|ellipse|line|path)', svg_content):
            draw.rectangle([50, 50, width-50, height-50], outline='#334155', width=2)
            text = "SVG Animation"
            try:
                bbox = draw.textbbox((0, 0), text)
                text_width = bbox[2] - bbox[0]
                x = (width - text_width) // 2
                draw.text((x, height//2), text, fill='#64748b')
            except:
                draw.text((width//3, height//2), text, fill='#64748b')
        
        return image
    
    def capture_animation_frames(self, svg_content, duration=3, fps=10, width=800, height=600, on_progress=None, transparent=False):
        """同步包装器"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                frames = loop.run_until_complete(
                    self._capture_animation_frames_async(svg_content, duration, fps, width, height, on_progress, transparent)
                )
            finally:
                loop.close()
            return frames
        except Exception as e:
            logger.error(f"异步捕获失败: {e}")
            return self._create_static_frames(svg_content, int(duration * fps), width, height, transparent)
    
    def export_to_bytes_with_progress(self, svg_content, format='gif', duration=5, fps=10, width=640, height=480, on_progress=None):
        """导出为字节流，支持进度回调"""
        try:
            import imageio
            import numpy as np
            
            if on_progress:
                on_progress(0, "开始导出...")
            
            # 提高分辨率以获得更好的质量
            if format == 'mp4':
                width = 800
                height = 600
                fps = 15  # 提高帧率
            else:
                width = 800  # GIF也使用更高分辨率
                height = 600
                fps = 10
            
            # 检测是否需要透明背景（仅GIF支持）
            transparent = False
            if format == 'gif':
                transparent = self._detect_transparent_background(svg_content)
                if transparent:
                    logger.info("检测到透明背景SVG，将导出透明GIF")
            
            frames = self.capture_animation_frames(svg_content, duration, fps, width, height, on_progress, transparent)
            
            if not frames:
                raise Exception("没有捕获到任何帧")
            
            if on_progress:
                on_progress(85, "正在生成文件...")
            
            suffix = '.gif' if format == 'gif' else '.mp4'
            temp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
            temp_path = temp_file.name
            temp_file.close()
            
            if format == 'gif':
                if transparent:
                    # 透明GIF需要特殊处理
                    self._save_transparent_gif(frames, temp_path, fps)
                else:
                    # 使用PIL保存高质量GIF
                    self._save_high_quality_gif(frames, temp_path, fps)
                
                logger.info(f"GIF导出完成: {len(frames)}帧, {fps}fps, 透明={transparent}")
            else:
                # MP4不支持透明，转换为RGB
                frame_arrays = [np.array(f.convert('RGB') if f.mode == 'RGBA' else f) for f in frames]
                
                # 使用更高质量的编码参数
                writer = imageio.get_writer(
                    temp_path, 
                    fps=fps, 
                    codec='libx264',
                    quality=9,  # 提高质量 (0-10, 10最高)
                    pixelformat='yuv420p',  # 兼容性更好
                    output_params=[
                        '-preset', 'slow',  # 更慢但质量更好
                        '-crf', '18',  # 恒定质量因子 (0-51, 越低质量越好)
                    ]
                )
                for frame in frame_arrays:
                    writer.append_data(frame)
                writer.close()
                
                logger.info(f"MP4导出完成: {len(frame_arrays)}帧, {fps}fps")
            
            if on_progress:
                on_progress(95, "正在读取文件...")
            
            with open(temp_path, 'rb') as f:
                data = f.read()
            
            os.unlink(temp_path)
            
            if on_progress:
                on_progress(100, "导出完成")
            
            return data
        except Exception as e:
            logger.error(f"导出失败: {e}")
            raise Exception(f"导出失败: {str(e)}")
    
    def _save_high_quality_gif(self, frames, output_path, fps):
        """保存高质量GIF - 使用统一调色板"""
        if not frames:
            return
        
        import numpy as np
        
        duration_ms = int(1000 / fps)
        
        # 收集所有帧用于创建统一调色板
        frame_list = [f.convert('RGB') if f.mode != 'RGB' else f for f in frames]
        
        # 取样帧创建统一调色板
        sample_frames = frame_list[::max(1, len(frame_list)//10)][:10]
        width, height = frame_list[0].size
        
        # 创建合并图像
        combined_width = width * len(sample_frames)
        combined_img = Image.new('RGB', (combined_width, height))
        
        for i, frame in enumerate(sample_frames):
            combined_img.paste(frame, (i * width, 0))
        
        # 量化得到统一调色板
        quantized_combined = combined_img.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        
        # 使用统一调色板处理所有帧
        processed_frames = []
        for frame in frame_list:
            p_frame = frame.quantize(palette=quantized_combined, dither=Image.Dither.FLOYDSTEINBERG)
            processed_frames.append(p_frame)
        
        # 保存GIF
        processed_frames[0].save(
            output_path,
            save_all=True,
            append_images=processed_frames[1:],
            duration=duration_ms,
            loop=0,
            optimize=False  # 不优化以保持质量
        )
        
        logger.info(f"高质量GIF保存成功: {len(processed_frames)}帧")
    
    def _save_transparent_gif(self, frames, output_path, fps):
        """保存透明背景GIF - 使用统一调色板避免闪烁"""
        if not frames:
            return
        
        import numpy as np
        
        duration_ms = int(1000 / fps)
        
        # 首先，合并所有帧创建一个统一的调色板
        # 将所有帧拼接成一个大图像来量化
        frame_list = []
        alpha_list = []
        
        for frame in frames:
            if frame.mode != 'RGBA':
                frame = frame.convert('RGBA')
            frame_list.append(frame)
            alpha_list.append(np.array(frame.split()[3]))
        
        # 取第一帧的尺寸
        width, height = frame_list[0].size
        
        # 创建一个包含所有帧的大图像（横向拼接）
        # 限制采样帧数以提高效率
        sample_frames = frame_list[::max(1, len(frame_list)//10)][:10]
        
        combined_width = width * len(sample_frames)
        combined_img = Image.new('RGB', (combined_width, height))
        
        for i, frame in enumerate(sample_frames):
            rgb_frame = frame.convert('RGB')
            combined_img.paste(rgb_frame, (i * width, 0))
        
        # 量化合并图像得到统一调色板（保留255色，1个用于透明）
        quantized_combined = combined_img.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
        global_palette = quantized_combined.getpalette()
        
        # 透明色索引设为255
        transparency_index = 255
        
        # 处理每一帧，使用统一调色板
        processed_frames = []
        
        for i, frame in enumerate(frame_list):
            rgb_frame = frame.convert('RGB')
            
            # 使用全局调色板量化
            p_frame = rgb_frame.quantize(palette=quantized_combined, dither=Image.Dither.FLOYDSTEINBERG)
            
            # 获取像素数据
            p_data = np.array(p_frame)
            a_data = alpha_list[i]
            
            # 将透明像素设置为透明索引
            p_data[a_data < 128] = transparency_index
            
            # 创建新的P模式图像
            new_frame = Image.fromarray(p_data, mode='P')
            new_frame.putpalette(global_palette)
            
            processed_frames.append(new_frame)
        
        # 保存GIF
        if processed_frames:
            processed_frames[0].save(
                output_path,
                save_all=True,
                append_images=processed_frames[1:],
                duration=duration_ms,
                loop=0,
                disposal=2,
                transparency=transparency_index
            )
            
            logger.info(f"透明GIF保存成功，使用统一调色板，透明色索引: {transparency_index}")
    
    def export_to_bytes(self, svg_content, format='gif', duration=5, fps=10, width=640, height=480):
        """导出为字节流（无进度回调）"""
        return self.export_to_bytes_with_progress(svg_content, format, duration, fps, width, height, None)

export_service = ExportService()
