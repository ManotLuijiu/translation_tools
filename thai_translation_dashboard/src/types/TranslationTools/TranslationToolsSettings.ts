export interface TranslationToolsSettings{
	name: string
	creation: string
	modified: string
	owner: string
	modified_by: string
	docstatus: 0 | 1 | 2
	parent?: string
	parentfield?: string
	parenttype?: string
	idx?: number
	// GitHub settings
	github_enable?: boolean
	github_repo?: string
	github_token?: string
	github_branch?: string
	use_own_repo?: boolean
	default_model_provider?: string
	default_model?: string
	openai_api_key?: string
	openai_balance_usd?: number
	anthropic_api_key?: string
	anthropic_balance_usd?: number
	batch_size?: number
	temperature?: number
	auto_save?: boolean
	preserve_formatting?: boolean
}
