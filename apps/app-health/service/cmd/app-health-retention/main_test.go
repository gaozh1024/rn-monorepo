package main

import "testing"

func TestRetentionMode(t *testing.T) {
	tests := []struct {
		name      string
		command   string
		envDryRun bool
		want      bool
		wantErr   bool
	}{
		{name: "dry run", command: "dry-run", want: true},
		{name: "run", command: "run", want: false},
		{name: "env true", command: "env", envDryRun: true, want: true},
		{name: "env false", command: "env", envDryRun: false, want: false},
		{name: "invalid", command: "bad", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := retentionMode(tt.command, tt.envDryRun)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("expected %v, got %v", tt.want, got)
			}
		})
	}
}
