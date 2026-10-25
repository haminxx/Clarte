/** Prompts are bundled as Text modules; see the `[[rules]]` block in each wrangler.toml. */
declare module "*.md" {
  const content: string;
  export default content;
}
