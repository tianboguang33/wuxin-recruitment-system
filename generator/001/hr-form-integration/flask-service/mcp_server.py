"""
HR Form Service - MCP Server
为 AI 智能体提供 MCP 协议接口，直接操作候选人数据。
自动启动 Flask 服务和 Cloudflare 外网隧道。
"""

import json
import os
import socket
import subprocess
import sys
import time
import threading
import re
from datetime import datetime
from mcp.server.fastmcp import FastMCP
from config import Config
from models import candidate_model

# ==================== 全局状态 ====================

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
FLASK_PROCESS = None
TUNNEL_PROCESS = None
EXTERNAL_URL = None
SERVICES_READY = False
TUNNEL_LOG = []


# ==================== 进程管理 ====================

def is_port_in_use(port=5000):
    """检查端口是否被占用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0


def start_flask():
    """启动 Flask 服务"""
    global FLASK_PROCESS

    if is_port_in_use(5000):
        return True, "Flask 服务已在运行"

    app_path = os.path.join(PROJECT_DIR, 'app.py')
    try:
        FLASK_PROCESS = subprocess.Popen(
            [sys.executable, app_path],
            cwd=PROJECT_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        # 等待启动
        for _ in range(30):
            time.sleep(0.5)
            if is_port_in_use(5000):
                return True, "Flask 服务启动成功"
        return False, "Flask 服务启动超时"
    except Exception as e:
        return False, f"Flask 服务启动失败: {str(e)}"


def start_cloudflare_tunnel():
    """启动 Cloudflare Tunnel"""
    global TUNNEL_PROCESS, EXTERNAL_URL, TUNNEL_LOG

    # 如果已有外部 URL，先检查隧道是否还活着
    if EXTERNAL_URL:
        try:
            import urllib.request
            resp = urllib.request.urlopen(f"{EXTERNAL_URL}/health", timeout=5)
            if resp.read():
                return True, f"Cloudflare 隧道已在运行: {EXTERNAL_URL}"
        except Exception:
            pass  # 隧道挂了，重新启动

    # 查找 cloudflared
    cloudflared_paths = [
        os.path.join(os.environ.get('LOCALAPPDATA', ''), 'cloudflared', 'cloudflared.exe'),
        os.path.join(os.environ.get('PROGRAMFILES', ''), 'cloudflared', 'cloudflared.exe'),
    ]

    # 尝试从 PATH 或已知位置找
    cloudflared_cmd = None
    for p in cloudflared_paths:
        if os.path.exists(p):
            cloudflared_cmd = p
            break

    # 尝试 npm 安装路径
    npm_path = os.path.join(
        os.environ.get('APPDATA', ''),
        'TRAE SOLO CN', 'ModularData', 'ai-agent', 'vm', 'tools', 'node',
        'node_modules', 'cloudflared', 'bin', 'cloudflared.exe'
    )
    if os.path.exists(npm_path):
        cloudflared_cmd = npm_path

    if not cloudflared_cmd:
        # 尝试直接运行 cloudflared
        cloudflared_cmd = 'cloudflared'

    TUNNEL_LOG = []
    try:
        TUNNEL_PROCESS = subprocess.Popen(
            [cloudflared_cmd, 'tunnel', '--url', 'http://localhost:5000'],
            cwd=PROJECT_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        # 读取输出，提取隧道 URL
        url_pattern = re.compile(r'https://[a-z0-9-]+\.trycloudflare\.com')
        for _ in range(60):  # 最多等 60 秒
            line = TUNNEL_PROCESS.stdout.readline()
            if line:
                TUNNEL_LOG.append(line.strip())
                match = url_pattern.search(line)
                if match:
                    EXTERNAL_URL = match.group(0)
                    return True, f"Cloudflare 隧道启动成功: {EXTERNAL_URL}"
            time.sleep(0.5)

        return False, "Cloudflare 隧道启动超时，未获取到外网链接"
    except Exception as e:
        return False, f"Cloudflare 隧道启动失败: {str(e)}"


def verify_external_url():
    """验证外网链接是否可用"""
    global EXTERNAL_URL

    if not EXTERNAL_URL:
        return False, "尚未获得外网链接"

    try:
        import urllib.request
        resp = urllib.request.urlopen(f"{EXTERNAL_URL}/health", timeout=10)
        data = json.loads(resp.read().decode())
        if data.get('status') == 'ok':
            return True, f"外网链接正常: {EXTERNAL_URL}"
        return False, "外网链接异常"
    except Exception as e:
        return False, f"外网链接不可达: {str(e)}"


def stop_services():
    """停止所有服务"""
    global FLASK_PROCESS, TUNNEL_PROCESS

    if TUNNEL_PROCESS:
        TUNNEL_PROCESS.terminate()
        TUNNEL_PROCESS = None

    if FLASK_PROCESS:
        FLASK_PROCESS.terminate()
        FLASK_PROCESS = None


# ==================== 初始化启动 ====================

def startup():
    """MCP 服务启动时自动初始化所有子服务"""
    global SERVICES_READY

    results = []

    # 1. 启动 Flask
    ok, msg = start_flask()
    results.append({"service": "Flask", "status": "ok" if ok else "error", "message": msg})

    # 2. 启动 Cloudflare 隧道
    ok, msg = start_cloudflare_tunnel()
    results.append({"service": "Cloudflare Tunnel", "status": "ok" if ok else "error", "message": msg})

    # 3. 验证外网
    if EXTERNAL_URL:
        ok, msg = verify_external_url()
        results.append({"service": "External URL", "status": "ok" if ok else "error", "message": msg})
    else:
        results.append({"service": "External URL", "status": "error", "message": "未获得外网链接")

    all_ok = all(r["status"] == "ok" for r in results)
    SERVICES_READY = all_ok

    return results


def get_form_base_url():
    """获取表单基础 URL"""
    if EXTERNAL_URL:
        return EXTERNAL_URL
    return f"http://localhost:{Config.PORT}"


# ==================== 创建 MCP 服务 ====================

mcp = FastMCP(
    name="HR Form Service",
    version="1.0.0",
    description="AI 招聘系统面试时间收集服务 - 自动启动 Flask + Cloudflare 外网隧道"
)


# ==================== 工具定义 ====================

@mcp.tool()
def create_candidate(
    candidate_id: str,
    name: str,
    email: str,
    job_title: str,
    time_slots: list[str],
    expected_salary: str = ""
) -> dict:
    """
    创建候选人记录并生成专属表单链接。
    在调用人事机器人之前请先调用 system_status 确认外网链接已打开。

    用途：当需要为候选人安排面试时，先调用此接口创建记录，然后将返回的表单链接发送给候选人。

    Args:
        candidate_id: 候选人唯一标识（建议格式：cand_001 或 UUID）
        name: 候选人姓名
        email: 候选人邮箱
        job_title: 应聘岗位名称
        time_slots: 可选面试时段列表，格式如 ["2026-06-26 14:00-14:45", "2026-06-27 10:00-10:45"]
        expected_salary: 期望薪资（可选，如 "20K-25K" 或 "面议"）

    Returns:
        包含 success、form_link、candidate_id、message 的字典
    """
    if not candidate_id or not name or not email or not job_title:
        return {"success": False, "error": "缺少必填参数", "error_code": "MISSING_PARAMETER"}

    if not time_slots or not isinstance(time_slots, list):
        return {"success": False, "error": "time_slots 应为非空数组", "error_code": "MISSING_PARAMETER"}

    existing = candidate_model.get_by_id(candidate_id)
    if existing:
        return {"success": False, "error": "候选人已存在", "error_code": "CANDIDATE_EXISTS"}

    try:
        candidate_model.create(
            candidate_id=candidate_id,
            name=name,
            email=email,
            job_title=job_title,
            time_slots=time_slots,
            expected_salary=expected_salary
        )

        base_url = get_form_base_url()
        form_link = f"{base_url}/form?candidate_id={candidate_id}"

        return {
            "success": True,
            "candidate_id": candidate_id,
            "form_link": form_link,
            "message": "候选人记录创建成功，请将表单链接发送给候选人"
        }
    except Exception as e:
        return {"success": False, "error": str(e), "error_code": "INTERNAL_ERROR"}


@mcp.tool()
def list_candidates(status: str = "pending", limit: int = 100) -> list[dict]:
    """
    查询候选人列表。

    用途：定时轮询获取已提交但未处理的候选人，或查看特定状态的候选人。

    Args:
        status: 候选人状态筛选，可选值：pending（默认）、confirmed、expired。传空字符串查询全部。
        limit: 返回数量上限，默认 100，最大 500

    Returns:
        候选人列表，每条包含 candidate_id、name、email、phone、job_title、selected_time、expected_salary、status、created_at、submitted_at
    """
    try:
        candidates = candidate_model.get_all(status=status or None, limit=limit)
        for c in candidates:
            c["candidate_id"] = c.pop("id")
        return candidates
    except Exception as e:
        return [{"error": str(e)}]


@mcp.tool()
def get_candidate(candidate_id: str) -> dict:
    """
    查询单个候选人的完整信息。

    用途：获取某个候选人的全部详情，包括可选时段、已选时段、备注等。

    Args:
        candidate_id: 候选人唯一标识

    Returns:
        候选人完整信息字典，包含所有字段
    """
    candidate = candidate_model.get_by_id(candidate_id)
    if not candidate:
        return {"success": False, "error": "候选人不存在", "error_code": "CANDIDATE_NOT_FOUND"}
    candidate["candidate_id"] = candidate.pop("id")
    return candidate


@mcp.tool()
def update_candidate_status(
    candidate_id: str,
    status: str,
    meeting_link: str = ""
) -> dict:
    """
    更新候选人状态。

    用途：确认候选人面试安排后，将状态更新为 confirmed 并附带会议链接；或将超时候选人标记为 expired。

    Args:
        candidate_id: 候选人唯一标识
        status: 目标状态，可选值：confirmed、expired
        meeting_link: 面试会议链接（可选，如腾讯会议链接）

    Returns:
        包含 success 和 message 的字典
    """
    if not candidate_id or not status:
        return {"success": False, "error": "缺少必填参数", "error_code": "MISSING_PARAMETER"}

    if status not in ["confirmed", "expired"]:
        return {"success": False, "error": f"无效的状态值: {status}，可选: confirmed, expired", "error_code": "INVALID_STATUS"}

    candidate = candidate_model.get_by_id(candidate_id)
    if not candidate:
        return {"success": False, "error": "候选人不存在", "error_code": "CANDIDATE_NOT_FOUND"}

    result = candidate_model.update_status(
        candidate_id=candidate_id,
        status=status,
        meeting_link=meeting_link if meeting_link else None
    )

    if not result.get("success"):
        return result

    msg = f"候选人 {candidate['name']} 状态已更新为 {status}"
    if meeting_link:
        msg += f"，会议链接: {meeting_link}"

    return {"success": True, "message": msg}


@mcp.tool()
def system_status() -> dict:
    """
    查看系统整体状态，包括 Flask 服务、Cloudflare 隧道和外网链接。
    在调用 create_candidate 之前，务必先调用此工具确认外网链接已打开。

    用途：确认 HR 表单服务的完整链路是否就绪，适合在开始任何操作前先检查。

    Returns:
        包含各组件状态、外网 URL 和健康检查结果的字典
    """
    global SERVICES_READY

    # 检查 Flask 端口
    flask_ok = is_port_in_use(5000)

    # 检查隧道进程
    tunnel_alive = TUNNEL_PROCESS is not None and TUNNEL_PROCESS.poll() is None

    # 验证外网
    ext_ok = False
    ext_msg = "未就绪"
    if EXTERNAL_URL and tunnel_alive:
        ok, msg = verify_external_url()
        ext_ok = ok
        ext_msg = msg

    SERVICES_READY = flask_ok and tunnel_alive and ext_ok

    result = {
        "services_ready": SERVICES_READY,
        "flask": {
            "status": "running" if flask_ok else "stopped",
            "port": 5000,
            "local_url": "http://localhost:5000"
        },
        "cloudflare_tunnel": {
            "status": "running" if tunnel_alive else "stopped",
            "process_id": TUNNEL_PROCESS.pid if TUNNEL_PROCESS else None
        },
        "external_url": {
            "url": EXTERNAL_URL or "未就绪",
            "status": "reachable" if ext_ok else "unreachable",
            "detail": ext_msg
        },
        "api_endpoints": {
            "create_candidate": "POST /api/candidates/create",
            "list_candidates": "GET /api/candidates",
            "get_candidate": "GET /api/candidate/<id>",
            "update_candidate": "POST /api/candidates/update",
            "submit_form": "POST /submit",
            "form_page": "GET /form?candidate_id=<id>"
        }
    }

    return result


@mcp.tool()
def restart_tunnel() -> dict:
    """
    重启 Cloudflare 隧道，刷新外网链接。
    如果外网链接失效，调用此工具重新建立隧道。

    Returns:
        重启结果
    """
    global TUNNEL_PROCESS, EXTERNAL_URL

    # 停旧隧道
    if TUNNEL_PROCESS:
        TUNNEL_PROCESS.terminate()
        TUNNEL_PROCESS = None
        EXTERNAL_URL = None
        time.sleep(2)

    # 启新隧道
    ok, msg = start_cloudflare_tunnel()
    if ok:
        verified, verify_msg = verify_external_url()
        if verified:
            return {"success": True, "external_url": EXTERNAL_URL, "message": msg}

    return {"success": False, "message": msg}


# ==================== 资源定义 ====================

@mcp.resource("hr://candidates/{status}")
def candidates_resource(status: str = "pending") -> str:
    """获取候选人列表（作为 MCP 资源）"""
    candidates = candidate_model.get_all(status=status or None, limit=100)
    for c in candidates:
        c["candidate_id"] = c.pop("id")
    return json.dumps(candidates, ensure_ascii=False, indent=2)


@mcp.resource("hr://candidate/{candidate_id}")
def candidate_resource(candidate_id: str) -> str:
    """获取单个候选人详情（作为 MCP 资源）"""
    candidate = candidate_model.get_by_id(candidate_id)
    if not candidate:
        return json.dumps({"error": "候选人不存在"}, ensure_ascii=False)
    candidate["candidate_id"] = candidate.pop("id")
    return json.dumps(candidate, ensure_ascii=False, indent=2)


@mcp.resource("hr://system/status")
def system_status_resource() -> str:
    """系统整体状态（作为 MCP 资源）"""
    return json.dumps(system_status(), ensure_ascii=False, indent=2)


# ==================== 启动入口 ====================

if __name__ == "__main__":
    print("[HR-MCP] HR Form Service MCP Server 启动中...")

    # 立即执行启动
    results = startup()
    for r in results:
        print(f"[HR-MCP] {r['service']}: {r['status']} - {r['message']}")

    if SERVICES_READY:
        print(f"[HR-MCP] 所有服务就绪！外网链接: {EXTERNAL_URL}")
    else:
        print("[HR-MCP] 部分服务启动失败，可调用 system_status 查看详情")

    print("[HR-MCP] MCP Server 等待客户端连接...")
    mcp.run(transport="stdio")