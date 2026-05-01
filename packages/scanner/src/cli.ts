import { Command } from 'commander';
import { createProgram } from './program.js';

createProgram(new Command()).parse();
