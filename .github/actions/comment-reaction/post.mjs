import { react } from './react.mjs';

const status = process.env['INPUT_JOB-STATUS'];

if (status === 'success') await react('hooray');
if (status === 'failure') await react('confused');
