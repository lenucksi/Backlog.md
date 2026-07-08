import { expect, test } from "@playwright/test";

test.describe("Critical user journeys", () => {
	test("board loads and renders task columns", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { name: "Kanban Board" })).toBeVisible();

		const taskCards = page.locator('[draggable="true"]');
		await expect(taskCards.first()).toBeVisible({ timeout: 5000 });

		// Verify tasks in "To Do" column
		await expect(page.getByRole("heading", { name: "To Do" })).toBeVisible();

		// Known tasks from seed data
		await expect(page.getByText("Implement login page")).toBeVisible();
		await expect(page.getByText("Set up CI pipeline")).toBeVisible();
		await expect(page.getByText("Fix navigation bug on mobile")).toBeVisible();
	});

	test("filters board by assignee and clears filter", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { name: "Kanban Board" })).toBeVisible();

		// Wait for tasks to render
		await expect(page.locator('[draggable="true"]').first()).toBeVisible({ timeout: 5000 });

		// Filter by assignee "bob"
		await page.getByRole("button", { name: /^Assignee / }).click();
		await page.locator("#board-assignee-filter-menu").getByRole("button", { name: "bob", exact: true }).click();

		// Only bob's tasks should be visible
		await expect(page.getByText("Set up CI pipeline")).toBeVisible();
		await expect(page.getByText("Database migration script")).toBeVisible();

		// Alice's tasks should NOT be visible
		await expect(page.getByText("Implement login page")).not.toBeVisible();

		// Clear filter
		await page.getByRole("button", { name: "Clear filters" }).click();

		// Alice's tasks should be visible again
		await expect(page.getByText("Implement login page")).toBeVisible();
	});

	test("filters board by priority", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { name: "Kanban Board" })).toBeVisible();
		await expect(page.locator('[draggable="true"]').first()).toBeVisible({ timeout: 5000 });

		// Filter by priority "high"
		await page.getByRole("button", { name: /^Priority / }).click();
		await page.locator("#board-priority-filter-menu").getByRole("button", { name: "high", exact: true }).click();

		// High priority tasks should be visible
		await expect(page.getByText("Implement login page")).toBeVisible();
		await expect(page.getByText("Set up CI pipeline")).toBeVisible();

		// Medium priority tasks should NOT be visible
		await expect(page.getByText("Write API documentation")).not.toBeVisible();
	});

	test("opens task detail modal and closes it", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { name: "Kanban Board" })).toBeVisible();

		// Wait for tasks and click the first card
		const firstCard = page.locator('[draggable="true"]').first();
		await expect(firstCard).toBeVisible({ timeout: 5000 });
		await firstCard.click();

		// Modal should open (accessible name is the task title from h2#modal-title)
		const modal = page.getByRole("dialog");
		await expect(modal).toBeVisible({ timeout: 3000 });

		// Should show task information in modal title (h2#modal-title has "TASK-1 — Implement login page")
		await expect(page.getByRole("heading", { name: /TASK-1.*Implement login page/i })).toBeVisible();

		// Close modal via X button
		await page.getByRole("button", { name: "Close modal" }).click();
		await expect(modal).not.toBeVisible();
	});

	test("navigates to milestones page and searches", async ({ page }) => {
		await page.goto("/milestones");
		await expect(page.getByRole("heading", { name: "Milestones" })).toBeVisible();

		// Search for a task
		const searchInput = page.getByRole("textbox", { name: "Search milestones" }).or(page.locator("#milestones-search"));
		await expect(searchInput.first()).toBeVisible({ timeout: 5000 });

		// Type a task ID to search
		await searchInput.first().fill("BACK-1");

		// Clear search
		await page.getByRole("button", { name: "Clear milestone search" }).click();
	});
});
