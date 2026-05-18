package security

import "strings"

var sensitiveKeyFragments = []string{
	"password",
	"token",
	"accesstoken",
	"refreshtoken",
	"authorization",
	"cookie",
	"phone",
	"idcard",
	"email",
}

const redacted = "[REDACTED]"

func Redact(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, item := range typed {
			if isSensitiveKey(key) {
				out[key] = redacted
				continue
			}
			out[key] = Redact(item)
		}
		return out
	case []any:
		out := make([]any, len(typed))
		for index, item := range typed {
			out[index] = Redact(item)
		}
		return out
	default:
		return value
	}
}

func isSensitiveKey(key string) bool {
	normalized := strings.ToLower(strings.ReplaceAll(key, "_", ""))
	for _, fragment := range sensitiveKeyFragments {
		if strings.Contains(normalized, fragment) {
			return true
		}
	}
	return false
}
