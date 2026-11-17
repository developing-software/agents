# envs/cloudflare/storage.tf — ports infra/alchemy/cf (storage)

resource "cloudflare_r2_bucket" "files" {
  account_id = var.account_id
  name       = "${local.prefix}-files"
}
