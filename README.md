# back-end-of-travel
游记app的部分后端支持
. 并发写入冲突
如果多个请求同时修改 data.json 文件，可能会导致写入冲突，从而返回 500。