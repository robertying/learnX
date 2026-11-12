import { sampleUrl } from 'data/mock';

const cdn = 'https://cdn.jsdelivr.net/gh/robertying/learnX@main/mock-files/';
const raw =
  'https://raw.githubusercontent.com/robertying/learnX/main/mock-files/';

it('loads samples from jsDelivr', () => {
  expect(sampleUrl('lecturePdf')).toBe(`${cdn}human-visual-system.pdf`);
  expect(sampleUrl('timingPng')).toBe(`${cdn}counter-timing.png`);
  expect(sampleUrl('scopeMp4')).toBe(`${cdn}scope-demo.mp4`);
  expect(sampleUrl('audioZip')).toBe(`${cdn}dtmf-signals.zip`);
});

it('loads the Office files jsDelivr refuses from GitHub', () => {
  expect(sampleUrl('labDocx')).toBe(`${raw}lab-report-template.docx`);
  expect(sampleUrl('dataXlsx')).toBe(`${raw}fir-measurements.xlsx`);
  expect(sampleUrl('slidesPptx')).toBe(`${raw}deep-learning-frameworks.pptx`);
});
