#!/usr/bin/env node
import { parseContext } from "./materialize/context.js";
import { readSettings } from "./materialize/settings.js";
import { generateDotenv } from "./materialize/dotenv.js";
import { generateWranglerJsonc } from "./materialize/wrangler.js";
const context = parseContext();
const settings = readSettings(context);
generateDotenv(settings, context);
generateWranglerJsonc(settings, context);
