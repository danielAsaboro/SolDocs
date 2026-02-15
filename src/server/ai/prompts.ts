import { AnchorIdl, AnchorInstruction, getIdlName } from '../types';

export function overviewPrompt(idl: AnchorIdl, programId: string): string {
  return `You are a Solana developer documentation expert. Generate a comprehensive overview for the following Anchor program.

Program ID: ${programId}
Program Name: ${getIdlName(idl)}
Number of Instructions: ${idl.instructions.length}
Number of Account Types: ${idl.accounts?.length || 0}
Number of Custom Types: ${idl.types?.length || 0}
Number of Events: ${idl.events?.length || 0}
Number of Error Codes: ${idl.errors?.length || 0}

Full IDL:
\`\`\`json
${JSON.stringify(idl, null, 2).slice(0, 15000)}
\`\`\`

Generate documentation in Markdown format with these sections:
## Program Overview
A clear description of what this program does, its purpose, and main features.

## Architecture
How the program is structured, key design patterns used.

## Key Features
Bullet-point list of main capabilities.

## Instructions Summary
A brief table summarizing all instructions (name, purpose, key accounts).

Be technical but readable. Use Solana-specific terminology correctly.`;
}

export function instructionsPrompt(instructions: AnchorInstruction[], programName: string): string {
  return `You are a Solana developer documentation expert. Generate detailed documentation for the following Anchor program instructions.

Program: ${programName}

Instructions:
\`\`\`json
${JSON.stringify(instructions, null, 2)}
\`\`\`

For EACH instruction, generate:

### \`instruction_name\`
**Description**: What this instruction does and when to use it.

**Accounts:**
| Name | Mutable | Signer | Description |
|------|---------|--------|-------------|
(fill in for each account)

**Arguments:**
| Name | Type | Description |
|------|------|-------------|
(fill in for each argument)

**Example Usage (TypeScript):**
\`\`\`typescript
// Provide a realistic TypeScript example using @coral-xyz/anchor
\`\`\`

Be thorough and technical. Infer account purposes from their names and constraints.`;
}

export function accountsPrompt(idl: AnchorIdl): string {
  const accounts = idl.accounts || [];
  const types = idl.types || [];

  return `You are a Solana developer documentation expert. Generate detailed documentation for the account types and custom types in this Anchor program.

Program: ${getIdlName(idl)}

Account Types:
\`\`\`json
${JSON.stringify(accounts, null, 2)}
\`\`\`

Custom Types:
\`\`\`json
${JSON.stringify(types, null, 2)}
\`\`\`

${idl.events ? `Events:\n\`\`\`json\n${JSON.stringify(idl.events, null, 2)}\n\`\`\`` : ''}

${idl.errors ? `Error Codes:\n\`\`\`json\n${JSON.stringify(idl.errors, null, 2)}\n\`\`\`` : ''}

Generate documentation in Markdown:

## Account Types
For each account type, document:
- Purpose and when it's created
- All fields with their types and descriptions
- Size estimation

## Custom Types
For each enum/struct, document its variants/fields and usage.

## Events
Document each event and when it's emitted.

## Error Codes
List all custom errors with their codes and descriptions.

Be thorough and use proper Solana/Anchor terminology.`;
}

export function securityPrompt(idl: AnchorIdl, programId: string): string {
  return `You are a Solana security auditor. Analyze the following Anchor program IDL and generate a security analysis.

Program: ${getIdlName(idl)}
Program ID: ${programId}

IDL:
\`\`\`json
${JSON.stringify(idl, null, 2).slice(0, 15000)}
\`\`\`

Generate a security analysis in Markdown:

## Access Control Analysis
- Which instructions require specific signers?
- Which accounts are mutable and could be modified?
- Are there admin/authority patterns?

## Common Pitfalls
- Potential issues developers should watch for when integrating
- Missing constraint patterns visible from the IDL

## Best Practices for Integration
- How to safely call these instructions
- Account validation checklist
- Recommended transaction ordering

## Trust Assumptions
- What trust model does this program assume?
- What authorities exist and what can they do?

Note: This is a static IDL analysis only. A full audit requires source code review.`;
}
