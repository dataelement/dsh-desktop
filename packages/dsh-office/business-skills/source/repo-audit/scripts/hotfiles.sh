#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="."
TOP_N=20
SINCE=""
UNTIL=""
AUTHOR=""
FORMAT="table"

usage() {
    cat <<'EOF'
用法: hotfiles.sh [选项]

分析 Git 仓库中变更最频繁的热点文件。

选项:
  --repo PATH       仓库路径（默认：当前目录）
  --top N           显示前 N 个文件（默认：20）
  --since DATE      起始日期，如 2024-01-01
  --until DATE      截止日期
  --author AUTHOR   按作者过滤
  --format FORMAT   输出格式：table / csv / json（默认：table）
  -h, --help        显示帮助
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo)    REPO_PATH="$2"; shift 2 ;;
        --top)     TOP_N="$2"; shift 2 ;;
        --since)   SINCE="$2"; shift 2 ;;
        --until)   UNTIL="$2"; shift 2 ;;
        --author)  AUTHOR="$2"; shift 2 ;;
        --format)  FORMAT="$2"; shift 2 ;;
        -h|--help) usage ;;
        *) echo "错误: 未知选项 '$1'" >&2; exit 1 ;;
    esac
done

if [[ ! -d "$REPO_PATH/.git" ]] && ! git -C "$REPO_PATH" rev-parse --git-dir >/dev/null 2>&1; then
    echo "错误: '$REPO_PATH' 不是一个 Git 仓库" >&2
    exit 1
fi

if ! [[ "$TOP_N" =~ ^[0-9]+$ ]] || [[ "$TOP_N" -lt 1 ]]; then
    echo "错误: --top 参数必须是正整数" >&2
    exit 1
fi

git_log_args=("--no-merges")

if [[ -n "$SINCE" ]]; then
    git_log_args+=("--since=$SINCE")
fi
if [[ -n "$UNTIL" ]]; then
    git_log_args+=("--until=$UNTIL")
fi
if [[ -n "$AUTHOR" ]]; then
    git_log_args+=("--author=$AUTHOR")
fi

raw_data=$(git -C "$REPO_PATH" log "${git_log_args[@]}" --name-only --pretty=format: -- | awk 'NF' | sort | uniq -c | sort -rn | head -n "$TOP_N")

if [[ -z "$raw_data" ]]; then
    echo "未找到符合条件的变更记录。" >&2
    exit 0
fi

declare -a counts=()
declare -a files=()
declare -a additions=()
declare -a deletions=()

while IFS= read -r line; do
    count=$(echo "$line" | awk '{print $1}')
    file=$(echo "$line" | awk '{print $2}')
    counts+=("$count")
    files+=("$file")

    numstat=$(git -C "$REPO_PATH" log --numstat --pretty=format: "${git_log_args[@]}" -- "$file" 2>/dev/null \
        | awk 'NF==3 && $1 != "-" {add+=$1; del+=$2} END {printf "%d %d", add, del}')
    add=$(echo "$numstat" | awk '{print $1}')
    del=$(echo "$numstat" | awk '{print $2}')
    additions+=("$add")
    deletions+=("$del")
done <<< "$raw_data"

total_count=${#files[@]}

case "$FORMAT" in
    table)
        printf "%-6s  %-8s  %-8s  %s\n" "排名" "提交次数" "增/删行数" "文件路径"
        printf "%-6s  %-8s  %-8s  %s\n" "----" "--------" "--------" "--------"
        for ((i=0; i<total_count; i++)); do
            rank=$((i + 1))
            churn="+${additions[$i]}/-${deletions[$i]}"
            printf "%-6s  %-8s  %-8s  %s\n" "$rank" "${counts[$i]}" "$churn" "${files[$i]}"
        done
        echo ""
        echo "共分析前 $total_count 个热点文件"
        ;;
    csv)
        echo "rank,commits,additions,deletions,file"
        for ((i=0; i<total_count; i++)); do
            echo "$((i+1)),${counts[$i]},${additions[$i]},${deletions[$i]},${files[$i]}"
        done
        ;;
    json)
        echo "["
        for ((i=0; i<total_count; i++)); do
            comma=","
            if [[ $((i+1)) -eq $total_count ]]; then comma=""; fi
            cat <<JSONITEM
  {"rank": $((i+1)), "commits": ${counts[$i]}, "additions": ${additions[$i]}, "deletions": ${deletions[$i]}, "file": "${files[$i]}"}${comma}
JSONITEM
        done
        echo "]"
        ;;
    *)
        echo "错误: 不支持的格式 '$FORMAT'，可选：table / csv / json" >&2
        exit 1
        ;;
esac
