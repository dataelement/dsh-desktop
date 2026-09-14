#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="."
BRANCH=""
SINCE=""
FORMAT="table"
SEVERITY="low"

PATTERNS_HIGH=(
    'AKIA[0-9A-Z]{16}'
    '-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----'
    'ghp_[A-Za-z0-9_]{36,}'
    'gho_[A-Za-z0-9_]{36,}'
    'ghu_[A-Za-z0-9_]{36,}'
    'ghs_[A-Za-z0-9_]{36,}'
    'ghr_[A-Za-z0-9_]{36,}'
    'glpat-[A-Za-z0-9\-_]{20,}'
    'xox[bprs]-[a-zA-Z0-9\-]{10,}'
    'sk-[a-zA-Z0-9]{32,}'
    'eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_\-]{20,}'
)

PATTERNS_MEDIUM=(
    'aws_secret_access_key\s*[=:]\s*[A-Za-z0-9/+=]{30,}'
    'AZURE[_-]?(CLIENT|TENANT|SUBSCRIPTION)[_-]?(SECRET|KEY|ID)\s*[=:]\s*['\''"][^'\''"]{8,}'
    'SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}'
    'sq0[a-z]{3}-[a-zA-Z0-9_-]{22,}'
    'sk_(live|test)_[a-zA-Z0-9]{24,}'
    'rk_(live|test)_[a-zA-Z0-9]{24,}'
    'AC[a-f0-9]{32}'
    'hooks\.slack\.com/services/T[A-Z0-9]{8}/B[A-Z0-9]{8,}/[a-zA-Z0-9]{24}'
)

PATTERNS_LOW=(
    '[aA][pP][iI][_-]?[kK][eE][yY]\s*[=:]\s*['\''"][a-zA-Z0-9_\-]{16,}['\''"]'
    '[aA][pP][iI][_-]?[sS][eE][cC][rR][eE][tT]\s*[=:]\s*['\''"][a-zA-Z0-9_\-]{16,}['\''"]'
    '[pP][aA][sS][sS][wW][oO][rR][dD]\s*[=:]\s*['\''"][^'\''"]{8,}['\''"]'
    '[sS][eE][cC][rR][eE][tT][_-]?[kK][eE][yY]\s*[=:]\s*['\''"][a-zA-Z0-9_\-]{16,}['\''"]'
    '[aA][cC][cC][eE][sS][sS][_-]?[tT][oO][kK][eE][nN]\s*[=:]\s*['\''"][a-zA-Z0-9_\-]{16,}['\''"]'
)

usage() {
    cat <<'EOF'
用法: secret-scan.sh [选项]

扫描 Git 历史中的密钥和敏感信息泄露。

选项:
  --repo PATH         仓库路径（默认：当前目录）
  --branch BRANCH     扫描指定分支（默认：所有分支）
  --since DATE        起始日期，如 2024-01-01
  --format FORMAT     输出格式：table / csv / json（默认：table）
  --severity LEVEL    最低严重级别：low / medium / high（默认：low）
  -h, --help          显示帮助
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo)      REPO_PATH="$2"; shift 2 ;;
        --branch)    BRANCH="$2"; shift 2 ;;
        --since)     SINCE="$2"; shift 2 ;;
        --format)    FORMAT="$2"; shift 2 ;;
        --severity)  SEVERITY="$2"; shift 2 ;;
        -h|--help)   usage ;;
        *) echo "错误: 未知选项 '$1'" >&2; exit 1 ;;
    esac
done

if [[ ! -d "$REPO_PATH/.git" ]] && ! git -C "$REPO_PATH" rev-parse --git-dir >/dev/null 2>&1; then
    echo "错误: '$REPO_PATH' 不是一个 Git 仓库" >&2
    exit 1
fi

case "$SEVERITY" in
    low|medium|high) ;;
    *) echo "错误: --severity 必须为 low / medium / high" >&2; exit 1 ;;
esac

build_patterns() {
    local patterns=()
    case "$SEVERITY" in
        low)
            patterns=("${PATTERNS_HIGH[@]}" "${PATTERNS_MEDIUM[@]}" "${PATTERNS_LOW[@]}")
            ;;
        medium)
            patterns=("${PATTERNS_HIGH[@]}" "${PATTERNS_MEDIUM[@]}")
            ;;
        high)
            patterns=("${PATTERNS_HIGH[@]}")
            ;;
    esac
    local combined=""
    for p in "${patterns[@]}"; do
        if [[ -n "$combined" ]]; then
            combined="$combined|$p"
        else
            combined="$p"
        fi
    done
    echo "$combined"
}

get_severity() {
    local match="$1"
    for p in "${PATTERNS_HIGH[@]}"; do
        if echo "$match" | grep -qE -- "$p" 2>/dev/null; then
            echo "HIGH"
            return
        fi
    done
    for p in "${PATTERNS_MEDIUM[@]}"; do
        if echo "$match" | grep -qE -- "$p" 2>/dev/null; then
            echo "MEDIUM"
            return
        fi
    done
    echo "LOW"
}

get_pattern_name() {
    local match="$1"
    if echo "$match" | grep -qE -- 'AKIA[0-9A-Z]{16}'; then echo "AWS Access Key"; return; fi
    if echo "$match" | grep -qE -- '-----BEGIN.*PRIVATE KEY'; then echo "Private Key"; return; fi
    if echo "$match" | grep -qE -- 'gh[pousr]_'; then echo "GitHub Token"; return; fi
    if echo "$match" | grep -qE -- 'glpat-'; then echo "GitLab Token"; return; fi
    if echo "$match" | grep -qE -- 'xox[bprs]-'; then echo "Slack Token"; return; fi
    if echo "$match" | grep -qE -- 'sk-[a-zA-Z0-9]{32}'; then echo "OpenAI API Key"; return; fi
    if echo "$match" | grep -qE -- 'eyJ.*\.eyJ'; then echo "JWT Token"; return; fi
    if echo "$match" | grep -qE -- 'aws_secret_access_key'; then echo "AWS Secret Key"; return; fi
    if echo "$match" | grep -qiE -- 'AZURE'; then echo "Azure Credential"; return; fi
    if echo "$match" | grep -qE -- 'SG\.'; then echo "SendGrid Key"; return; fi
    if echo "$match" | grep -qE -- 'sq0'; then echo "Square Token"; return; fi
    if echo "$match" | grep -qE -- 'sk_(live|test)_'; then echo "Stripe Key"; return; fi
    if echo "$match" | grep -qE -- 'rk_(live|test)_'; then echo "Stripe Restricted Key"; return; fi
    if echo "$match" | grep -qE -- 'AC[a-f0-9]{32}'; then echo "Twilio SID"; return; fi
    if echo "$match" | grep -qE -- 'hooks\.slack\.com'; then echo "Slack Webhook"; return; fi
    if echo "$match" | grep -qiE -- 'api[_-]?key'; then echo "Generic API Key"; return; fi
    if echo "$match" | grep -qiE -- 'api[_-]?secret'; then echo "Generic API Secret"; return; fi
    if echo "$match" | grep -qiE -- 'password'; then echo "Hardcoded Password"; return; fi
    if echo "$match" | grep -qiE -- 'secret[_-]?key'; then echo "Generic Secret Key"; return; fi
    if echo "$match" | grep -qiE -- 'access[_-]?token'; then echo "Generic Access Token"; return; fi
    echo "Potential Secret"
}

COMBINED_PATTERN=$(build_patterns)

log_args=("--all" "--diff-filter=ACMR" "-p")
if [[ -n "$BRANCH" ]]; then
    log_args=("$BRANCH" "--diff-filter=ACMR" "-p")
fi
if [[ -n "$SINCE" ]]; then
    log_args+=("--since=$SINCE")
fi

tmpfile=$(mktemp)
trap 'rm -f "$tmpfile"' EXIT

current_commit=""
current_file=""
current_date=""
current_author=""
finding_count=0

while IFS= read -r line; do
    if [[ "$line" =~ ^commit\ ([a-f0-9]{40}) ]]; then
        current_commit="${BASH_REMATCH[1]}"
        continue
    fi
    if [[ "$line" =~ ^Author:\ (.+)\ \< ]]; then
        current_author="${BASH_REMATCH[1]}"
        continue
    fi
    if [[ "$line" =~ ^Date:\ +(.+) ]]; then
        current_date=$(echo "${BASH_REMATCH[1]}" | awk '{print $1, $2, $3, $4, $5}')
        continue
    fi
    if [[ "$line" =~ ^diff\ --git\ a/(.+)\ b/ ]]; then
        current_file="${BASH_REMATCH[1]}"
        continue
    fi
    if [[ "$line" =~ ^\+[^+] ]]; then
        added_line="${line:1}"
        if echo "$added_line" | grep -qE -- "$COMBINED_PATTERN" 2>/dev/null; then
            matched_text=$(echo "$added_line" | grep -oE -- "$COMBINED_PATTERN" 2>/dev/null | head -1)
            if [[ -n "$matched_text" ]]; then
                sev=$(get_severity "$matched_text")
                pname=$(get_pattern_name "$matched_text")
                short_commit="${current_commit:0:8}"

                masked_text="${matched_text:0:8}...REDACTED"

                echo "${sev}|${pname}|${short_commit}|${current_file}|${current_author}|${current_date}|${masked_text}" >> "$tmpfile"
                finding_count=$((finding_count + 1))
            fi
        fi
    fi
done < <(git -C "$REPO_PATH" log "${log_args[@]}" 2>/dev/null)

if [[ $finding_count -eq 0 ]]; then
    echo "扫描完成，未发现密钥泄露风险。"
    exit 0
fi

sort -t'|' -k1,1r "$tmpfile" > "${tmpfile}.sorted"
mv "${tmpfile}.sorted" "$tmpfile"

case "$FORMAT" in
    table)
        high_count=$(grep -c '^HIGH|' "$tmpfile" 2>/dev/null || true)
        med_count=$(grep -c '^MEDIUM|' "$tmpfile" 2>/dev/null || true)
        low_count=$(grep -c '^LOW|' "$tmpfile" 2>/dev/null || true)

        echo "=== 密钥泄露扫描报告 ==="
        echo ""
        echo "发现 $finding_count 处潜在泄露（HIGH: $high_count, MEDIUM: $med_count, LOW: $low_count）"
        echo ""
        printf "%-8s  %-22s  %-10s  %-30s  %-16s  %s\n" "严重度" "类型" "Commit" "文件" "作者" "匹配内容"
        printf "%-8s  %-22s  %-10s  %-30s  %-16s  %s\n" "------" "----------------------" "--------" "------------------------------" "----------------" "--------"
        while IFS='|' read -r sev pname commit file author date masked; do
            printf "%-8s  %-22s  %-10s  %-30s  %-16s  %s\n" "$sev" "$pname" "$commit" "$file" "$author" "$masked"
        done < "$tmpfile"
        echo ""
        echo "提示: 如果发现真实泄露，请立即轮换（rotate）对应的密钥或凭据。"
        ;;
    csv)
        echo "severity,type,commit,file,author,date,matched"
        while IFS='|' read -r sev pname commit file author date masked; do
            echo "\"$sev\",\"$pname\",\"$commit\",\"$file\",\"$author\",\"$date\",\"$masked\""
        done < "$tmpfile"
        ;;
    json)
        echo "{"
        echo "  \"total_findings\": $finding_count,"
        echo "  \"findings\": ["
        local_count=0
        while IFS='|' read -r sev pname commit file author date masked; do
            local_count=$((local_count + 1))
            comma=","
            if [[ $local_count -eq $finding_count ]]; then comma=""; fi
            cat <<JSONITEM
    {"severity": "$sev", "type": "$pname", "commit": "$commit", "file": "$file", "author": "$author", "date": "$date", "matched": "$masked"}${comma}
JSONITEM
        done < "$tmpfile"
        echo "  ]"
        echo "}"
        ;;
    *)
        echo "错误: 不支持的格式 '$FORMAT'，可选：table / csv / json" >&2
        exit 1
        ;;
esac
