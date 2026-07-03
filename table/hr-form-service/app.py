import os
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from config import Config
from models import candidate_model
print(f"[APP] models loaded from {candidate_model.__module__}", flush=True)

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config.from_object(Config)

# 启用 CORS
CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})


def get_base_url():
    """获取基础 URL"""
    host = request.host
    scheme = request.scheme
    return f"{scheme}://{host}"


def api_error(message, error_code, status_code=400):
    """统一错误响应格式"""
    response = jsonify({
        "success": False,
        "error": message,
        "error_code": error_code
    })
    response.status_code = status_code
    return response


def api_success(data=None, message="操作成功"):
    """统一成功响应格式"""
    result = {"success": True, "message": message}
    if data:
        result.update(data)
    return jsonify(result)


# ==================== API 路由 ====================

@app.route('/api/candidates/create', methods=['POST'])
def create_candidate():
    """
    创建候选人记录
    AI 智能体调用此接口创建候选人记录，获取专属表单链接
    """
    data = request.get_json()

    if not data:
        return api_error("请求体不能为空", "MISSING_PARAMETER", 400)

    candidate_id = data.get('candidate_id')
    name = data.get('name')
    email = data.get('email')
    job_title = data.get('job_title')
    time_slots = data.get('time_slots', [])
    expected_salary = data.get('expected_salary', '')

    # 参数校验
    if not candidate_id:
        return api_error("缺少必填参数: candidate_id", "MISSING_PARAMETER", 400)
    if not name:
        return api_error("缺少必填参数: name", "MISSING_PARAMETER", 400)
    if not email:
        return api_error("缺少必填参数: email", "MISSING_PARAMETER", 400)
    if not job_title:
        return api_error("缺少必填参数: job_title", "MISSING_PARAMETER", 400)

    # 检查候选人是否已存在
    existing = candidate_model.get_by_id(candidate_id)
    if existing:
        return api_error("候选人已存在", "CANDIDATE_EXISTS", 409)

    try:
        result, form_link = candidate_model.create(
            candidate_id=candidate_id,
            name=name,
            email=email,
            job_title=job_title,
            time_slots=time_slots,
            expected_salary=expected_salary
        )

        if not result:
            return api_error("候选人已存在", "CANDIDATE_EXISTS", 409)

        return api_success({
            "form_link": form_link,
            "candidate_id": candidate_id
        }, "候选人记录创建成功")

    except Exception as e:
        return api_error(f"创建候选人失败: {str(e)}", "INTERNAL_ERROR", 500)


@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    """
    获取候选人列表
    AI 智能体定时轮询此接口，获取已提交但未处理的候选人
    """
    status = request.args.get('status', 'pending')
    limit = request.args.get('limit', 100, type=int)

    try:
        candidates = candidate_model.get_all(status=status, limit=limit)
        return jsonify(candidates)
    except Exception as e:
        return api_error(f"获取候选人列表失败: {str(e)}", "INTERNAL_ERROR", 500)


@app.route('/api/candidate/<candidate_id>', methods=['GET'])
def get_candidate(candidate_id):
    """
    获取单个候选人信息
    """
    candidate = candidate_model.get_by_id(candidate_id)

    if not candidate:
        return api_error("候选人不存在", "CANDIDATE_NOT_FOUND", 404)

    return jsonify(candidate)


@app.route('/api/candidates/update', methods=['POST'])
def update_candidate():
    """
    更新候选人状态
    AI 智能体确认候选人后，更新状态
    只允许更新 status = 'pending' 的记录
    """
    data = request.get_json()

    if not data:
        return api_error("请求体不能为空", "MISSING_PARAMETER", 400)

    candidate_id = data.get('candidate_id')
    status = data.get('status')
    meeting_link = data.get('meeting_link')

    if not candidate_id:
        return api_error("缺少必填参数: candidate_id", "MISSING_PARAMETER", 400)
    if not status:
        return api_error("缺少必填参数: status", "MISSING_PARAMETER", 400)

    # 检查候选人是否存在
    candidate = candidate_model.get_by_id(candidate_id)
    if not candidate:
        return api_error("候选人不存在", "CANDIDATE_NOT_FOUND", 404)

    try:
        result = candidate_model.update_status(candidate_id, status, meeting_link)
        if not result.get("success"):
            error_code = result.get("error_code", "CANDIDATE_STATUS_CHANGED")
            status_code = 400 if error_code == "CANDIDATE_STATUS_CHANGED" else 500
            return api_error(result.get("error", "更新失败"), error_code, status_code)

        return api_success(message="候选人状态已更新")
    except Exception as e:
        return api_error(f"更新候选人状态失败: {str(e)}", "INTERNAL_ERROR", 500)


@app.route('/debug', methods=['GET'])
def debug():
    """调试端点"""
    import os
    from config import Config
    path = Config.DATABASE_PATH.replace('.db', '.json')
    return {
        'config_db_path': Config.DATABASE_PATH,
        'json_path': path,
        'json_exists': os.path.exists(path),
        'cwd': os.getcwd(),
    }


@app.route('/submit', methods=['POST'])
def submit_form():
    """
    表单提交处理（事务安全版本）
    候选人提交表单后，系统接收并存储数据
    """
    data = request.get_json()

    if not data:
        return api_error("请求体不能为空", "MISSING_PARAMETER", 400)

    candidate_id = data.get('candidate_id')
    selected_time = data.get('selected_time')
    phone = data.get('phone')
    expected_salary = data.get('expected_salary')
    note = data.get('note')

    # 参数校验
    if not candidate_id:
        return api_error("缺少必填参数: candidate_id", "MISSING_PARAMETER", 400)
    if not selected_time:
        return api_error("缺少必填参数: selected_time", "MISSING_PARAMETER", 400)

    # 检查候选人是否存在
    candidate = candidate_model.get_by_id(candidate_id)
    if not candidate:
        return api_error("候选人不存在", "CANDIDATE_NOT_FOUND", 404)

    # 检查候选人是否已确认
    if candidate['status'] == 'confirmed':
        return api_error("候选人已确认，无法修改", "CANDIDATE_ALREADY_CONFIRMED", 400)

    # 检查候选人状态是否为 pending
    if candidate['status'] != 'pending':
        return api_error("该链接已失效", "CANDIDATE_STATUS_CHANGED", 400)

    try:
        # 使用事务安全的方法更新
        result = candidate_model.update_submission(
            candidate_id=candidate_id,
            selected_time=selected_time,
            phone=phone,
            expected_salary=expected_salary,
            note=note
        )

        if not result.get("success"):
            error_code = result.get("error_code", "INTERNAL_ERROR")
            status_code = 400 if error_code in ["TIME_SLOT_OCCUPIED", "CANDIDATE_STATUS_CHANGED"] else 500
            return api_error(result.get("error", "提交失败"), error_code, status_code)

        return api_success({
            "candidate_id": candidate_id
        }, "面试时间已确认")

    except Exception as e:
        import traceback, sys
        traceback.print_exc(file=sys.stderr)
        # 找出引发错误的行
        tb = traceback.format_exc()
        return api_error(f"提交表单失败: {str(e)} | {tb[:200]}", "INTERNAL_ERROR", 500)


# ==================== 页面路由 ====================

@app.route('/form', methods=['GET'])
def form_page():
    """
    表单页面展示
    候选人通过链接访问表单页面，看到自己的信息和可选时间段
    只允许访问 status = 'pending' 的候选人
    """
    candidate_id = request.args.get('candidate_id')

    if not candidate_id:
        return render_template('form.html',
                               error=True,
                               error_title="参数错误",
                               error_message="缺少候选人标识，请检查链接是否完整。")

    candidate = candidate_model.get_by_id(candidate_id)

    if not candidate:
        return render_template('form.html',
                               error=True,
                               error_title="链接无效",
                               error_message="未找到该候选人信息，链接可能已过期或无效。")

    # 关键校验：只允许 status = 'pending' 的候选人访问表单
    if candidate['status'] != 'pending':
        return render_template('form.html',
                               error=True,
                               error_title="链接已失效",
                               error_message="该面试邀请链接已失效，如有疑问请联系HR。")

    from datetime import datetime, timedelta

    return render_template('form.html',
                           error=False,
                           candidate=candidate,
                           min_datetime=(datetime.now() + timedelta(minutes=5)).strftime('%Y-%m-%dT%H:%M'))


# ==================== 根路由 ====================

@app.route('/', methods=['GET'])
def index():
    """根路由 - 返回服务状态信息"""
    return jsonify({
        "service": "HR Form Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "create_candidate": "POST /api/candidates/create",
            "list_candidates": "GET /api/candidates",
            "get_candidate": "GET /api/candidate/<candidate_id>",
            "update_candidate": "POST /api/candidates/update",
            "submit_form": "POST /submit",
            "form_page": "GET /form?candidate_id=<id>"
        }
    })


# ==================== 健康检查 ====================

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({"status": "ok"})


# ==================== 错误处理 ====================

@app.errorhandler(404)
def not_found(error):
    if request.path.startswith('/api/'):
        return api_error("接口不存在", "NOT_FOUND", 404)
    return render_template('form.html',
                           error=True,
                           error_title="页面未找到",
                           error_message="您访问的页面不存在。"), 404


@app.errorhandler(500)
def internal_error(error):
    if request.path.startswith('/api/'):
        return api_error("服务器内部错误", "INTERNAL_ERROR", 500)
    return render_template('form.html',
                           error=True,
                           error_title="服务器错误",
                           error_message="服务器发生错误，请稍后重试。"), 500


# ==================== 启动应用 ====================

if __name__ == '__main__':
    port = Config.PORT
    debug = Config.FLASK_DEBUG
    print(f"启动服务: http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
