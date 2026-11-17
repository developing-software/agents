<script module lang="ts">
	import type { Story } from '../story';
	import Select from './Select.svelte';

	const options = [
		{ value: 'issue', label: 'Issue' },
		{ value: 'doing', label: 'Doing', hint: 'in progress' },
		{ value: 'done', label: 'Done' }
	];

	export const story: Story = {
		title: 'Select',
		blurb: 'Options carry an optional `hint`, appended after an em dash.',
		of: Select,
		base: { options },
		props: {
			value: { type: 'select', value: 'issue', options: ['issue', 'doing', 'done'] },
			disabled: { type: 'bool', value: false }
		},
		variants: [
			{ label: 'default', props: {} },
			{ label: 'hint selected', props: { value: 'doing' } },
			{ label: 'disabled', props: { disabled: true } }
		]
	};
</script>
