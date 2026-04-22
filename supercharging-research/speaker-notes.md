# Supercharging Research with Agents: Speaker Notes & Demo Commands

**Speaker:** Will Leeney
**Topic:** Building a research system with AI agents, MCP, and Claude Code

---

## Title

- intro
- Today we're building a research system and second brain live. Everything you see me do, you can do


## 0 - assumptions

- Q - who's used what?
- Q - whos comfortable with what?
- relatively agnostic, there's always a way to do things that are provider agnostic 


## context 

- Q - whos repeated instructions?
- Q - whos got a claude.md file etc?

- give as much context to the model to make it work well 
- set of instructions
- we want something that fits us
- compared out-of-the-box 
- you can add to this to make it your own 
- or you can use karpathy (be simple, surgical, be goal driven)


## skills 

- Q - who's comfortable with what a skill is? 
- Q - who's made a custom skill

- skill is a recipe, like a script with non-determinitic flow, repeatable instructions for the LLM
- resume / rewind are more plugins but you still access them in this slash command way


DEMO - use the rewind and resume skill etc

## using

- Q - who gets annoyed at claude


plan 
- do this first, check scope, check context, really capable but naive
It allows you to understand what the LLM has understood. It allows you to check scope. It allows you to check context and make sure you're going on the right path. If you were planning on sailing a ship, like making sure that you're on the right trajectory before you even start. It's working out. Am I going towards America or have I just pointed myself in the wrong direction? Am I going to Iceland instead? 


rewind
- if it goes off track, don't correct the path, but walk back and take the correct one

parallel
Q - 2, 3, 5, 10
- you can have more than one running at a time
- You're now not having to go off on these journeys by yourself, which take a long time. You are like the master of an empire. You can send them off for 10 minutes at a time while you get to work prompting something else and starting off a new journey. 

verify
- write a test to reproduce this bug
- on this benchmark, we are looking for metric x and y, iterate until


## routines

- useful, alarm-like, helpful for creating systems
- can run this natively or on a VPS / server that's always on

## mcp 

Q - whos connected an MCP

DEMO - use the /mcp command
list tools etc
then use the mcp to get outstanding issues on linear


## second brain

Q - how do people store notes, notion, obsidian etc?

building a system that takes information from various sources, creates a knowledge graph and allows better interfacing with notes
can put in the clutter as well as structured info

uses claude (we are focused on the brain element) but you can use routines if you want to go automation 
this builds in obsidian because it plays nicely with graphify 

## feynman 

collection of skills to do research

demo to list the skills

## obsidian

graphical interface to your knowledge
acts as a drive
we are going to want some system which you can just chuck stuff at and produce a knowledge graph
auto generate a graph without doing the gardening
we want a gardener and to just chuck whatever we want in and it'll organise it

demo - maybe show a vault

## graphify

this does exactly that 
extracts entities and relationships using natural language
does community detection to find interesting relationships
outputs a graph like structure
update this however you want

demo the graphify

## grant writing

how is this useful - writing grants / papers / benchmarking / investigate
easier to interact with your knowledge and ask questions

so we are going to put this all together now
we've got an agent that does lit reviews, we've got our collection of unstructured info
we've got mcps that connect up our project management, ticketing, messaging systems
lets just let it run wild

demo - etc

## take it home

maybe one-click installation is grand
