import urllib.request, json

# Check directly on API server
req = urllib.request.Request('http://localhost:3000/api/jobs/published/list?pageSize=20')
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
print('=== 已发布岗位（直接API） ===')
for item in data.get('items', []):
    print('  #{} {} | {} | {} | {}'.format(item['id'], item['job_name'], item['department'], item['publish_status'], item['salary']))
print('共 {} 个已发布岗位'.format(data.get('total', 0)))
