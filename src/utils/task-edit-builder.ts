import type { TaskUpdateInput } from "../types/index.ts";
import type { TaskEditArgs } from "../types/task-edit-args.ts";
import { normalizeStringList } from "./task-builders.ts";

function sanitizeStringArray(values: string[] | undefined): string[] | undefined {
	if (!values) return undefined;
	const trimmed = values.map((value) => String(value).trim()).filter((value) => value.length > 0);
	return trimmed.length > 0 ? trimmed : undefined;
}

function toAcceptanceCriteriaEntries(values: string[] | undefined) {
	if (!values) return undefined;
	const trimmed = values.map((value) => String(value).trim()).filter((value) => value.length > 0);
	if (trimmed.length === 0) {
		return undefined;
	}
	return trimmed.map((text, index) => ({ text, checked: false, index: index + 1 }));
}

function collectChecklistAdditions(items: string[] | undefined): { text: string; checked: boolean }[] | undefined {
	if (!items?.length) return undefined;
	const additions = items
		.map((text) => String(text).trim())
		.filter((text) => text.length > 0)
		.map((text) => ({ text, checked: false }));
	return additions.length > 0 ? additions : undefined;
}

function collectIndexArray(items: number[] | undefined): number[] | undefined {
	return items?.length ? [...items] : undefined;
}

function applyScalarFields(args: TaskEditArgs, target: TaskUpdateInput): void {
	if (typeof args.title === "string") target.title = args.title;
	if (typeof args.description === "string") target.description = args.description;
	if (typeof args.status === "string") target.status = args.status;
	if (typeof args.priority === "string") target.priority = args.priority;
	if (typeof args.ordinal === "number") target.ordinal = args.ordinal;
}

function applyMilestoneField(args: TaskEditArgs, target: TaskUpdateInput): void {
	if (args.milestone === null) {
		target.milestone = null;
	} else if (typeof args.milestone === "string") {
		const trimmed = args.milestone.trim();
		target.milestone = trimmed.length > 0 ? trimmed : null;
	}
}

function applyLabelFields(args: TaskEditArgs, target: TaskUpdateInput): void {
	const labels = normalizeStringList(args.labels);
	if (labels) target.labels = labels;
	const addLabels = normalizeStringList(args.addLabels);
	if (addLabels) target.addLabels = addLabels;
	const removeLabels = normalizeStringList(args.removeLabels);
	if (removeLabels) target.removeLabels = removeLabels;
	if (args.clearLabels) target.clearLabels = true;
}

function applyAssigneeField(args: TaskEditArgs, target: TaskUpdateInput): void {
	const assignee = normalizeStringList(args.assignee);
	if (assignee) target.assignee = assignee;
}

function applyStringArrayFields(args: TaskEditArgs, target: TaskUpdateInput): void {
	const deps = sanitizeStringArray(args.dependencies);
	if (deps) target.dependencies = deps;
	const refs = sanitizeStringArray(args.references);
	if (refs) target.references = refs;
	const addRefs = sanitizeStringArray(args.addReferences);
	if (addRefs) target.addReferences = addRefs;
	const removeRefs = sanitizeStringArray(args.removeReferences);
	if (removeRefs) target.removeReferences = removeRefs;
	const docs = sanitizeStringArray(args.documentation);
	if (docs) target.documentation = docs;
	const addDocs = sanitizeStringArray(args.addDocumentation);
	if (addDocs) target.addDocumentation = addDocs;
	const removeDocs = sanitizeStringArray(args.removeDocumentation);
	if (removeDocs) target.removeDocumentation = removeDocs;
	const files = sanitizeStringArray(args.modifiedFiles);
	if (files) target.modifiedFiles = files;
}

function applyTextSectionFields(args: TaskEditArgs, target: TaskUpdateInput): void {
	const planSet = args.planSet ?? args.implementationPlan;
	if (typeof planSet === "string") target.implementationPlan = planSet;
	const planAppends = sanitizeStringArray(args.planAppend);
	if (planAppends) target.appendImplementationPlan = planAppends;
	if (args.planClear) target.clearImplementationPlan = true;

	const notesSet = args.notesSet ?? args.implementationNotes;
	if (typeof notesSet === "string") target.implementationNotes = notesSet;
	const notesAppends = sanitizeStringArray(args.notesAppend);
	if (notesAppends) target.appendImplementationNotes = notesAppends;
	if (args.notesClear) target.clearImplementationNotes = true;

	if (typeof args.finalSummary === "string") target.finalSummary = args.finalSummary;
	const summaryAppends = sanitizeStringArray(args.finalSummaryAppend);
	if (summaryAppends) target.appendFinalSummary = summaryAppends;
	if (args.finalSummaryClear) target.clearFinalSummary = true;
}

function applyAcceptanceCriteriaFields(args: TaskEditArgs, target: TaskUpdateInput): void {
	const criteriaSet = toAcceptanceCriteriaEntries(args.acceptanceCriteriaSet);
	if (criteriaSet) target.acceptanceCriteria = criteriaSet;

	const addAc = collectChecklistAdditions(args.acceptanceCriteriaAdd);
	if (addAc) target.addAcceptanceCriteria = addAc;

	const removeAc = collectIndexArray(args.acceptanceCriteriaRemove);
	if (removeAc) target.removeAcceptanceCriteria = removeAc;

	const checkAc = collectIndexArray(args.acceptanceCriteriaCheck);
	if (checkAc) target.checkAcceptanceCriteria = checkAc;

	const uncheckAc = collectIndexArray(args.acceptanceCriteriaUncheck);
	if (uncheckAc) target.uncheckAcceptanceCriteria = uncheckAc;
}

function applyDefinitionOfDoneFields(args: TaskEditArgs, target: TaskUpdateInput): void {
	const addDod = collectChecklistAdditions(args.definitionOfDoneAdd);
	if (addDod) target.addDefinitionOfDone = addDod;

	const removeDod = collectIndexArray(args.definitionOfDoneRemove);
	if (removeDod) target.removeDefinitionOfDone = removeDod;

	const checkDod = collectIndexArray(args.definitionOfDoneCheck);
	if (checkDod) target.checkDefinitionOfDone = checkDod;

	const uncheckDod = collectIndexArray(args.definitionOfDoneUncheck);
	if (uncheckDod) target.uncheckDefinitionOfDone = uncheckDod;
}

export function buildTaskUpdateInput(args: TaskEditArgs): TaskUpdateInput {
	const updateInput: TaskUpdateInput = {};

	applyScalarFields(args, updateInput);
	applyMilestoneField(args, updateInput);
	applyLabelFields(args, updateInput);
	applyAssigneeField(args, updateInput);
	applyStringArrayFields(args, updateInput);
	applyTextSectionFields(args, updateInput);
	applyAcceptanceCriteriaFields(args, updateInput);
	applyDefinitionOfDoneFields(args, updateInput);

	return updateInput;
}
