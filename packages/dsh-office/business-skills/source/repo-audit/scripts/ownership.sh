#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="."
SUB_PATH=""
TOP_N=10
SINCE=""
FORMAT="table"

usage() {
    cat <<'EOF'
用法: ownership.sh [选项]

分析 Git 仓库中代码的归属关系（谁拥有哪些代码）。

选项:
  --repo PATH       仓库路径（默认：当前目录）
  --path SUBPATH    分析指定子目录或文件
  --top N           显示前 N 位贡献者（默认：10）
  --since DATE      起始日期，如 2024-01-01
  --format FORMAT   输出格式：table / csv / json（默认：table）
  -h, --help        显示帮助
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo)    REPO_PATH="$2"; shift 2 ;;
        --path)    SUB_PATH="$2"; shift 2 ;;
        --top)     TOP_N="$2"; shift 2 ;;
        --since)   SINCE="$2"; shift 2 ;;
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

shortlog_args=("-sne" "--no-merges")
log_args=("--no-merges" "--pretty=format:%aN")

if [[ -n "$SINCE" ]]; then
    shortlog_args+=("--since=$SINCE")
    log_args+=("--since=$SINCE")
fi

path_args=()
if [[ -n "$SUB_PATH" ]]; then
    path_args=("--" "$SUB_PATH")
fi

commit_data=$(git -C "$REPO_PATH" shortlog "${shortlog_args[@]}" HEAD "${path_args[@]}" 2>/dev/null | head -n "$TOP_N")

if [[ -z "$commit_data" ]]; then
    echo "未找到符合条件的贡献记录。" >&2
    exit 0
fi

total_commits=$(git -C "$REPO_PATH" shortlog -sne --no-merges ${SINCE:+--since="$SINCE"} HEAD "${path_args[@]}" 2>/dev/null \
    | awk '{sum+=$1} END {print sum}')

if [[ "$total_commits" -eq 0 ]]; then
    total_commits=1
fi

declare -a authors=()
declare -a commit_counts=()
declare -a add_lines=()
declare -a del_lines=()
declare -a last_dates=()
declare -a percentages=()

while IFS= read -r line; do
    count=$(echo "$line" | awk '{print $1}')
    author=$(echo "$line" | sed 's/^[[:space:]]*[0-9]*[[:space:]]*//' | sed 's/[[:space:]]*<.*$//')

    commit_counts+=("$count")
    authors+=("$author")

    pct=$(awk "BEGIN {printf \"%.1f\", ($count / $total_commits) * 100}")
    percentages+=("$pct")

    numstat=$(git -C "$REPO_PATH" log --numstat --no-merges --pretty=format: --author="$author" ${SINCE:+--since="$SINCE"} HEAD "${path_args[@]}" 2>/dev/null \
        | awk 'NF==3 && $1 != "-" {add+=$1; del+=$2} END {printf "%d %d", add, del}')
    add=$(echo "$numstat" | awk '{print $1}')
    del=$(echo "$numstat" | awk '{print $2}')
    add_lines+=("$add")
    del_lines+=("$del")

    last_date=$(git -C "$REPO_PATH" log -1 --format="%ai" --no-merges --author="$author" ${SINCE:+--since="$SINCE"} HEAD "${path_args[@]}" 2>/dev/null \
        | awk '{print $1}')
    last_dates+=("${last_date:-N/A}")
done <<< "$commit_data"

author_count=${#authors[@]}

case "$FORMAT" in
    table)
        scope_desc="整个仓库"
        if [[ -n "$SUB_PATH" ]]; then
            scope_desc="$SUB_PATH"
        fi
        echo "代码归属分析 — 范围: $scope_desc"
        echo ""
        printf "%-6s  %-20s  %-10s  %-8s  %-14s  %s\n" "排名" "贡献者" "提交次数" "占比" "增/删行数" "最近活跃"
        printf "%-6s  %-20s  %-10s  %-8s  %-14s  %s\n" "----" "--------------------" "----------" "--------" "--------------" "----------"
        for ((i=0; i<author_count; i++)); do
            rank=$((i + 1))
            churn="+${add_lines[$i]}/-${del_lines[$i]}"
            printf "%-6s  %-20s  %-10s  %-8s  %-14s  %s\n" "$rank" "${authors[$i]}" "${commit_counts[$i]}" "${percentages[$i]}%" "$churn" "${last_dates[$i]}"
        done
        echo ""
        echo "总提交数: $total_commits | 显示前 $author_count 位贡献者"
        ;;
    csv)
        echo "rank,author,commits,percentage,additions,deletions,last_active"
        for ((i=0; i<author_count; i++)); do
            echo "$((i+1)),\"${authors[$i]}\",${commit_counts[$i]},${percentages[$i]},${add_lines[$i]},${del_lines[$i]},${last_dates[$i]}"
        done
        ;;
    json)
        echo "{"
        echo "  \"total_commits\": $total_commits,"
        if [[ -n "$SUB_PATH" ]]; then
            echo "  \"scope\": \"$SUB_PATH\","
        else
            echo "  \"scope\": \".\","
        fi
        echo "  \"contributors\": ["
        for ((i=0; i<author_count; i++)); do
            comma=","
            if [[ $((i+1)) -eq $author_count ]]; then comma=""; fi
            cat <<JSONITEM
    {"rank": $((i+1)), "author": "${authors[$i]}", "commits": ${commit_counts[$i]}, "percentage": ${percentages[$i]}, "additions": ${add_lines[$i]}, "deletions": ${del_lines[$i]}, "last_active": "${last_dates[$i]}"}${comma}
JSONITEM
        done
        echo "  ]"
        echo "}"
        ;;
    *)
        echo "错误: 不支持的格式 '$FORMAT'，可选：table / csv / json" >&2
        exit 1
        ;;
esac
