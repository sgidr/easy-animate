import json
import os
import requests
import logging
from dotenv import load_dotenv

# 确保环境变量已加载
load_dotenv()

logger = logging.getLogger(__name__)

# 可用模型列表
AVAILABLE_MODELS = [
    {'id': 'claude-haiku-4-5-20251001', 'name': 'Claude Haiku 4.5', 'provider': 'claude'},
    {'id': 'gemini-3-flash-preview', 'name': 'Gemini 3 Flash', 'provider': 'gemini'},
    {'id': 'gemini-3-pro-preview-11-2025', 'name': 'Gemini 3 Pro', 'provider': 'gemini'},
]

class AIService:
    def __init__(self):
        # 直接从环境变量读取，而不是从Config
        self.api_key = os.environ.get('CLAUDE_API_KEY', '')
        self.base_url = os.environ.get('CLAUDE_API_BASE_URL', 'https://yunwu.ai/v1')
        self.default_model = os.environ.get('CLAUDE_MODEL', 'claude-haiku-4-5-20251001')
        self._current_model = None  # 缓存当前模型
        
        # 验证配置
        if not self.api_key:
            logger.warning("⚠️ CLAUDE_API_KEY 未配置")
        
        logger.info(f"AI Service 初始化: Default Model={self.default_model}, Base URL={self.base_url}")

    def _get_headers(self):
        """获取请求头"""
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }

    def _get_current_model(self):
        """从数据库获取当前配置的模型"""
        try:
            # 延迟导入避免循环依赖
            from models import SystemConfig, db
            # 确保在应用上下文中
            if db.session:
                model = SystemConfig.get('ai_model', self.default_model)
                return model if model else self.default_model
            return self.default_model
        except Exception as e:
            logger.warning(f"获取模型配置失败: {e}, 使用默认模型")
            return self.default_model

    def _validate_config(self) -> tuple[bool, str]:
        """验证API配置"""
        if not self.api_key:
            return False, "CLAUDE_API_KEY 未配置，请在 .env 文件中设置"
        if not self.base_url:
            return False, "CLAUDE_API_BASE_URL 未配置"
        return True, ""

    def get_available_models(self):
        """获取可用模型列表"""
        return AVAILABLE_MODELS

    def get_current_model_info(self):
        """获取当前模型信息"""
        try:
            model_id = self._get_current_model()
            for m in AVAILABLE_MODELS:
                if m['id'] == model_id:
                    return m
            return {'id': model_id, 'name': model_id, 'provider': 'unknown'}
        except Exception as e:
            logger.warning(f"获取模型信息失败: {e}")
            return {'id': self.default_model, 'name': self.default_model, 'provider': 'unknown'}

    def set_model(self, model_id: str) -> bool:
        """设置当前使用的模型"""
        try:
            # 延迟导入避免循环依赖
            from models import SystemConfig, db
            if db.session:
                SystemConfig.set('ai_model', model_id, '当前使用的AI模型')
                logger.info(f"模型已切换为: {model_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"设置模型失败: {e}")
            return False

    def generate_animation(self, prompt: str, duration: int = 30, params: dict = None) -> dict:
        """根据用户描述生成SVG动画数据"""
        
        # 验证配置
        is_valid, error_msg = self._validate_config()
        if not is_valid:
            return {"success": False, "error": error_msg}
        
        # 获取当前模型
        model = self._get_current_model()
        
        # 用户可调参数
        params = params or {}
        bg_color = params.get('bgColor', '#0f172a')
        primary_color = params.get('primaryColor', '#6366f1')
        accent_color = params.get('accentColor', '#22d3ee')
        animation_speed = params.get('speed', 1.0)
        
        system_prompt = f"""你是一个专业的SVG动画生成助手。根据用户的描述，生成教学演示用的SVG动画。

【重要】你必须返回一个有效的JSON对象，不要包含任何其他文字说明。

JSON格式要求：
{{
    "title": "动画标题（简短）",
    "description": "动画描述",
    "category": "分类（物理/化学/生物/数学/地理/其他）",
    "svg_content": "完整的SVG代码字符串",
    "animation_data": {{
        "elements": [],
        "duration": {duration},
        "width": 800,
        "height": 600,
        "params": {{
            "bgColor": "{bg_color}",
            "primaryColor": "{primary_color}",
            "accentColor": "{accent_color}",
            "speed": {animation_speed}
        }}
    }}
}}

【SVG动画核心要求】：
1. 必须使用CSS @keyframes定义真实的动画效果
2. 动画必须是连续循环的，使用 animation: name Xs infinite
3. 包含多个动画元素，每个元素有不同的动画效果
4. 使用transform进行移动、旋转、缩放动画
5. 使用opacity进行淡入淡出效果
6. 动画时长约{duration}秒，速度系数{animation_speed}

【文字布局规范 - 非常重要】：
1. 画布尺寸为 800x600，合理规划布局区域
2. 标题放在顶部（y=40-60），字号24-28px
3. 主要动画内容放在中间区域（y=100-450）
4. 说明文字/标签放在底部或元素旁边，避免与动画元素重叠
5. 每个文字元素之间至少保持30px的垂直间距
6. 使用 text-anchor="middle" 居中对齐文字
7. 标签文字使用较小字号（12-14px），放在对应元素附近但不重叠
8. 如果有多行文字，使用不同的y坐标，每行间隔25-30px
9. 动态文字（如数值显示）要预留足够空间，避免数字变化时重叠
10. 文字不要放在动画路径上，避免被移动的元素遮挡

【配色方案】：
- 背景色: {bg_color}
- 主色调: {primary_color}
- 强调色: {accent_color}
- 文字颜色: #e2e8f0（主要文字）、#94a3b8（次要文字/标签）

【SVG代码示例结构】：
<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @keyframes move {{ 0% {{ transform: translateX(0); }} 50% {{ transform: translateX(100px); }} 100% {{ transform: translateX(0); }} }}
      @keyframes rotate {{ from {{ transform: rotate(0deg); }} to {{ transform: rotate(360deg); }} }}
      @keyframes pulse {{ 0%, 100% {{ opacity: 1; }} 50% {{ opacity: 0.5; }} }}
      .title {{ font-size: 26px; font-weight: bold; fill: #e2e8f0; text-anchor: middle; }}
      .label {{ font-size: 14px; fill: #94a3b8; text-anchor: middle; }}
      .animated {{ animation: move {duration}s ease-in-out infinite; }}
    </style>
  </defs>
  <rect width="800" height="600" fill="{bg_color}"/>
  <!-- 标题区域 y=50 -->
  <text x="400" y="50" class="title">标题</text>
  <!-- 动画内容区域 y=100-450 -->
  <!-- 说明文字区域 y=500-580 -->
</svg>

【必须包含的动画类型】：
- 位移动画 (translateX/Y)
- 旋转动画 (rotate)  
- 缩放动画 (scale)
- 透明度动画 (opacity)

请确保SVG代码完整、有效，动画流畅自然，文字布局清晰不重叠。"""

        try:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"请为以下主题生成一个{duration}秒的教学动画，要求动画效果丰富、流畅：\n\n{prompt}"}
                ],
                "temperature": 0.7,
                "max_tokens": 8000
            }
            
            logger.info(f"📡 发送API请求: {self.base_url}/chat/completions, 模型: {model}")
            logger.debug(f"Payload: {json.dumps(payload, ensure_ascii=False)[:200]}...")
            
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self._get_headers(),
                json=payload,
                timeout=240
            )
            
            logger.info(f"📊 API 响应状态码: {response.status_code}")
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"❌ API 错误: {response.status_code} - {error_text}")
                
                # 尝试解析错误信息
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', {}).get('message', error_text)
                except:
                    error_msg = error_text
                
                return {"success": False, "error": f"API Error: {response.status_code} - {error_msg}"}
            
            data = response.json()
            content = data['choices'][0]['message']['content']
            
            logger.debug(f"✅ API 返回内容长度: {len(content)}")
            
            # 尝试解析JSON
            try:
                result = json.loads(content)
                logger.info("✅ JSON 解析成功")
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ JSON 解析失败: {str(e)}")
                # 如果不是纯JSON，尝试提取JSON部分
                import re
                
                # 尝试多种方式提取JSON
                json_patterns = [
                    r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}',  # 嵌套JSON
                    r'\{.*\}',  # 简单JSON
                ]
                
                result = None
                for pattern in json_patterns:
                    json_match = re.search(pattern, content, re.DOTALL)
                    if json_match:
                        try:
                            result = json.loads(json_match.group())
                            logger.info(f"✅ 从响应中提取 JSON 成功 (使用模式: {pattern[:20]}...)")
                            break
                        except json.JSONDecodeError:
                            continue
                
                if result is None:
                    logger.warning("⚠️ 无法解析 JSON，使用默认动画")
                    result = self._generate_default_animation(prompt, duration)
            
            return {"success": True, "data": result}
        except requests.exceptions.Timeout:
            error_msg = "请求超时，API 服务器响应缓慢"
            logger.error(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}
        except requests.exceptions.ConnectionError as e:
            error_msg = f"连接失败: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}
        except Exception as e:
            error_msg = f"发生错误: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}

    def generate_storyboard(self, prompt: str) -> dict:
        """生成分镜规划"""
        
        # 验证配置
        is_valid, error_msg = self._validate_config()
        if not is_valid:
            return {"success": False, "error": error_msg}
        
        system_prompt = """你是一个教学动画分镜规划师。根据用户描述，规划动画的分镜脚本。

返回JSON格式：
{
    "scenes": [
        {
            "scene_number": 1,
            "duration": 5,
            "description": "场景描述",
            "elements": ["元素列表"],
            "animation_notes": "动画说明"
        }
    ],
    "total_duration": 总时长,
    "style_guide": "风格指南"
}"""

        try:
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "user", "content": f"{system_prompt}\n\n{prompt}"}
                ],
                "temperature": 0.7,
                "max_tokens": 2000
            }
            
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self._get_headers(),
                json=payload,
                timeout=240
            )
            
            if response.status_code != 200:
                return {"success": False, "error": f"API Error: {response.status_code}"}
            
            data = response.json()
            content = data['choices'][0]['message']['content']
            
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    result = {"scenes": [], "total_duration": 0, "style_guide": ""}
            
            return {"success": True, "data": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _generate_default_animation(self, prompt: str, duration: int, params: dict = None) -> dict:
        """生成默认SVG动画（当API返回非JSON时）"""
        params = params or {}
        bg_color = params.get('bgColor', '#0f172a')
        primary_color = params.get('primaryColor', '#6366f1')
        accent_color = params.get('accentColor', '#22d3ee')
        
        return {
            "title": prompt[:50] or "教学动画",
            "description": prompt,
            "category": "其他",
            "svg_content": f"""<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @keyframes rotate {{
        from {{ transform: rotate(0deg); }}
        to {{ transform: rotate(360deg); }}
      }}
      @keyframes pulse {{
        0%, 100% {{ transform: scale(1); opacity: 1; }}
        50% {{ transform: scale(1.1); opacity: 0.8; }}
      }}
      @keyframes float {{
        0%, 100% {{ transform: translateY(0); }}
        50% {{ transform: translateY(-20px); }}
      }}
      @keyframes dash {{
        to {{ stroke-dashoffset: 0; }}
      }}
      .bg {{ fill: {bg_color}; }}
      .circle-outer {{ 
        fill: none; 
        stroke: {accent_color}; 
        stroke-width: 3;
        transform-origin: 400px 280px;
        animation: rotate {duration}s linear infinite;
      }}
      .circle-inner {{ 
        fill: none; 
        stroke: {primary_color}; 
        stroke-width: 2;
        transform-origin: 400px 280px;
        animation: rotate {duration * 0.7}s linear infinite reverse;
      }}
      .center-dot {{
        fill: {accent_color};
        transform-origin: 400px 280px;
        animation: pulse 2s ease-in-out infinite;
      }}
      .orbit-dot {{
        fill: {primary_color};
        animation: float 3s ease-in-out infinite;
      }}
      .title {{ 
        font-size: 28px; 
        font-weight: bold; 
        fill: #e2e8f0;
        text-anchor: middle;
      }}
      .subtitle {{
        font-size: 16px;
        fill: #94a3b8;
        text-anchor: middle;
      }}
    </style>
  </defs>
  <rect width="800" height="600" class="bg"/>
  <circle cx="400" cy="280" r="120" class="circle-outer"/>
  <circle cx="400" cy="280" r="80" class="circle-inner"/>
  <circle cx="400" cy="280" r="15" class="center-dot"/>
  <circle cx="400" cy="160" r="10" class="orbit-dot"/>
  <circle cx="520" cy="280" r="8" class="orbit-dot" style="animation-delay: 0.5s;"/>
  <circle cx="400" cy="400" r="8" class="orbit-dot" style="animation-delay: 1s;"/>
  <circle cx="280" cy="280" r="8" class="orbit-dot" style="animation-delay: 1.5s;"/>
  <text x="400" y="500" class="title">{prompt[:30]}</text>
  <text x="400" y="530" class="subtitle">教学演示动画</text>
</svg>""",
            "animation_data": {
                "elements": [
                    {"id": "circle-outer", "type": "circle", "animation": {"type": "rotate", "duration": f"{duration}s"}},
                    {"id": "circle-inner", "type": "circle", "animation": {"type": "rotate", "duration": f"{duration * 0.7}s"}},
                    {"id": "center-dot", "type": "circle", "animation": {"type": "pulse", "duration": "2s"}},
                    {"id": "orbit-dots", "type": "circle", "animation": {"type": "float", "duration": "3s"}}
                ],
                "duration": duration,
                "width": 800,
                "height": 600,
                "params": params
            }
        }

ai_service = AIService()
