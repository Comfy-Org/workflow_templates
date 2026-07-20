import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import type { SatoriOptions } from 'satori';

const WIDTH = 1200;
const HEIGHT = 630;

// Module-scoped font cache
let fontsPromise: Promise<SatoriOptions['fonts']> | null = null;

async function loadFonts(): Promise<SatoriOptions['fonts']> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    const [regular, bold] = await Promise.all([
      fetch(
        'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf'
      ).then((r) => r.arrayBuffer()),
      fetch(
        'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf'
      ).then((r) => r.arrayBuffer()),
    ]);
    return [
      { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
      { name: 'Inter', data: bold, weight: 700 as const, style: 'normal' as const },
    ];
  })();
  return fontsPromise;
}

// Comfy wordmark SVG (brand/comfy-wordmark-yellow.svg) inlined as base64 data URI (avoids fs.readFileSync in serverless)
const LOGO_DATA_URI =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjc4IiBoZWlnaHQ9Ijc4IiB2aWV3Qm94PSIwIDAgMjc4IDc4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMjMyLjE1MSA3Ny4xNzYxQzIzMC42NDUgNzcuMTc2MSAyMjkuNDMgNzYuNjIwOCAyMjguNjM4IDc1LjU2OTdDMjI3LjgyMyA3NC40ODg5IDIyNy42MTEgNzIuOTgxMSAyMjguMDU1IDcxLjQzMzNMMjMwLjgwMSA2MS44NTc2QzIzMS43MDggNTguNjkxNCAyMzUuMDIzIDU2LjExNTcgMjM4LjE5IDU2LjExNTdIMjQ0LjM0NkMyNDUuMDc4IDU2LjExNTcgMjQ1LjcyMSA1NS42MzEgMjQ1LjkyMyA1NC45Mjc2TDI0Ni45ODUgNTEuMjI0NUMyNDcuMTI3IDUwLjcyODYgMjQ3LjAyOCA1MC4xOTU4IDI0Ni43MTggNDkuNzg0QzI0Ni40MDggNDkuMzczIDI0NS45MjMgNDkuMTMxIDI0NS40MDcgNDkuMTMxTDIzMS45MTcgNDkuMTMzNEMyMzEuODQxIDQ5LjEyMyAyMzEuNzcxIDQ5LjExODEgMjMxLjY5NCA0OS4xMTgxSDIyNy4xNDlDMjI1LjY0MyA0OS4xMTgxIDIyNC40MjggNDguNTYyOSAyMjMuNjM2IDQ3LjUxMThDMjIyLjgyMiA0Ni40MzEgMjIyLjYwOSA0NC45MjMyIDIyMy4wNTMgNDMuMzc2MkwyMjMuNTgzIDQxLjUyNzFDMjIzLjcyNSA0MS4wMzIgMjIzLjYyNiA0MC40OTkyIDIyMy4zMTYgNDAuMDg3M0MyMjMuMDA2IDM5LjY3NjMgMjIyLjUyMSAzOS40MzQ0IDIyMi4wMDYgMzkuNDM0NEgyMjAuMjY1QzIxOS41MzIgMzkuNDM0NCAyMTguODg5IDM5LjkxOTEgMjE4LjY4NyA0MC42MjMzTDIxNy44OTggNDMuMzc2MkMyMTYuOTkxIDQ2LjU0MjQgMjEzLjY3NiA0OS4xMTgxIDIxMC41MDkgNDkuMTE4MUgyMDQuMzY5QzIwMy42MzggNDkuMTE4MSAyMDIuOTk1IDQ5LjYwMTMgMjAyLjc5MiA1MC4zMDNMMjAxLjA0NyA1Ni4zNDE1QzIwMS4wNCA1Ni4zNjQ3IDIwMS4wMiA1Ni40MjY0IDIwMS4wMTMgNTYuNDQ5NkwxOTguNTIyIDY1LjA3ODNDMTk4LjUxMSA2NS4xMDc5IDE5OC40OTYgNjUuMTU1MiAxOTguNDg3IDY1LjE4NTdMMTk2LjY4NSA3MS40MzE2QzE5NS43NzcgNzQuNjAwMiAxOTIuNDYyIDc3LjE3NjEgMTg5LjI5NSA3Ny4xNzYxSDE3OS43MkMxNzguMjE0IDc3LjE3NjEgMTc2Ljk5OSA3Ni42MjA4IDE3Ni4yMDcgNzUuNTY5N0MxNzUuMzkzIDc0LjQ4OTcgMTc1LjE4IDcyLjk4MTkgMTc1LjYyNCA3MS40MzQxTDE4My42NDkgNDMuNTk2NkMxODMuNjU5IDQzLjU2NzcgMTgzLjY3OCA0My41MTAxIDE4My42ODcgNDMuNDgwNEwxODQuMjQ3IDQxLjUyODhDMTg0LjM5IDQxLjAzMzcgMTg0LjI5MiA0MC41MDAxIDE4My45ODIgNDAuMDg4M0MxODMuNjcxIDM5LjY3NjQgMTgzLjE4NiAzOS40MzQ1IDE4Mi42NzEgMzkuNDM0NUgxODAuOTQ3QzE4MC4yMTYgMzkuNDM0NSAxNzkuNTc0IDM5LjkxODMgMTc5LjM3MSA0MC42MjAyTDE3NS44NzggNTIuNzI1MUMxNzUuODY3IDUyLjc1NDcgMTc1Ljg1MiA1Mi44MDI4IDE3NS44NDQgNTIuODMyNUwxNzQuNTI1IDU3LjQwMTZDMTczLjYxNyA2MC41NzEgMTcwLjMwMiA2My4xNDc2IDE2Ny4xMzYgNjMuMTQ3NkgxNTcuNTZDMTU2LjA1NCA2My4xNDc2IDE1NC44MzkgNjIuNTkyMyAxNTQuMDQ3IDYxLjU0MTJDMTUzLjIzMyA2MC40NTk2IDE1My4wMiA1OC45NTE5IDE1My40NjQgNTcuNDA0OEwxNTkuMjgzIDM3LjIwMjRDMTU5LjQyNiAzNi43MDczIDE1OS4zMjcgMzYuMTczNyAxNTkuMDE3IDM1Ljc2MTFDMTU4LjcwNyAzNS4zNDkzIDE1OC4yMjIgMzUuMTA3NCAxNTcuNzA2IDM1LjEwNzRIMTU1Ljk3M0MxNTUuMjQxIDM1LjEwNzQgMTU0LjU5NyAzNS41OTIxIDE1NC4zOTUgMzYuMjk1NUwxNTEuOTE1IDQ0LjkzNDVDMTUxLjkwNSA0NC45NjM0IDE1MS44ODkgNDUuMDEwNiAxNTEuODgxIDQ1LjA0MDNMMTQ4LjMxMSA1Ny40MDE2QzE0Ny40MDEgNjAuNTcxIDE0NC4wODYgNjMuMTQ3NiAxNDAuOTIgNjMuMTQ3NkgxMzEuMzQ1QzEyOS44MzkgNjMuMTQ3NiAxMjguNjI0IDYyLjU5MjMgMTI3LjgzMiA2MS41NDEyQzEyNy4wMTcgNjAuNDYwNCAxMjYuODA1IDU4Ljk1MjYgMTI3LjI0OSA1Ny40MDQ4TDEyOS45OTUgNDcuODI5MUMxMzAuMDA1IDQ3LjgwMDMgMTMwLjAyIDQ3Ljc1NDYgMTMwLjAyOCA0Ny43MjQ5TDEzMy4wNzIgMzcuMTg1NUMxMzMuMjE1IDM2LjY5MDQgMTMzLjExNyAzNi4xNTYgMTMyLjgwNyAzNS43NDQyQzEzMi40OTcgMzUuMzMyNCAxMzIuMDEyIDM1LjA4OTYgMTMxLjQ5NiAzNS4wODk2SDEyOS43NzlDMTI5LjA0OCAzNS4wODk2IDEyOC40MDUgMzUuNTczNSAxMjguMjAyIDM2LjI3NTRMMTI3Ljk1NCAzNy4xMzc0QzEyNy45NDUgMzcuMTYyMyAxMjcuOTI2IDM3LjIyMDggMTI3LjkxOSAzNy4yNDU2TDEyMi4zMiA1Ni42MjE5QzEyMi4zMTIgNTYuNjQ3NSAxMjIuMjkxIDU2LjcxIDEyMi4yODQgNTYuNzM1N0wxMjIuMDkzIDU3LjQwNzlDMTIxLjE4NiA2MC41NzA5IDExNy44NzEgNjMuMTQ3NSAxMTQuNzA1IDYzLjE0NzVIMTA1LjEyOUMxMDMuNjIzIDYzLjE0NzUgMTAyLjQwOCA2Mi41OTIyIDEwMS42MTYgNjEuNTQxMUMxMDAuODAyIDYwLjQ2MDMgMTAwLjU5IDU4Ljk1MjUgMTAxLjAzMyA1Ny40MDQ3TDEwMS41NjEgNTUuNTYzNkMxMDEuNzAzIDU1LjA2ODUgMTAxLjYwNCA1NC41MzU3IDEwMS4yOTQgNTQuMTIzOUMxMDAuOTg0IDUzLjcxMjkgMTAwLjQ5OSA1My40NzA5IDk5Ljk4MzkgNTMuNDcwOUg5OC4yNDg2Qzk3LjUxOCA1My40NzA5IDk2Ljg3NSA1My45NTQxIDk2LjY3MjMgNTQuNjU2N0w5NS44Nzk1IDU3LjQwMTVDOTQuOTcwNiA2MC41NzA5IDkxLjY1NTggNjMuMTQ3NSA4OC40ODkxIDYzLjE0NzVIODIuMjgzNkM4MS41NTE4IDYzLjE0NzUgODAuOTA4IDYzLjYzMjIgODAuNzA2NSA2NC4zMzU2TDc4LjY3MTEgNzEuNDMzMkM3Ny43NjM3IDc0LjYwMDIgNzQuNDQ4OSA3Ny4xNzYgNzEuMjgxOSA3Ny4xNzZINjEuNzA2N0M2MC4yMDAxIDc3LjE3NiA1OC45ODUxIDc2LjYyMDcgNTguMTkzMiA3NS41Njk2QzU3LjM3ODggNzQuNDg4OCA1Ny4xNjY0IDcyLjk4MSA1Ny42MTA3IDcxLjQzMzJMNTkuMzg2MSA2NS4yNDAxQzU5LjUyODMgNjQuNzQ1IDU5LjQyOTMgNjQuMjEyMyA1OS4xMTkzIDYzLjgwMDRDNTguODA5MyA2My4zODk0IDU4LjMyNDIgNjMuMTQ3NSA1Ny44MDkgNjMuMTQ3NUg1Mi42OTg3QzUxLjE5MjkgNjMuMTQ3NSA0OS45Nzc5IDYyLjU5MjIgNDkuMTg1MiA2MS41NDExQzQ4LjM3MTIgNjAuNDYwMyA0OC4xNTg1IDU4Ljk1MjUgNDguNjAyNCA1Ny40MDU1TDQ5LjEzMDQgNTUuNTYzNkM0OS4yNzIyIDU1LjA2ODUgNDkuMTczMiA1NC41MzU3IDQ4Ljg2MzIgNTQuMTIzOUM0OC41NTMyIDUzLjcxMjkgNDguMDY4IDUzLjQ3MDkgNDcuNTUyOCA1My40NzA5SDQ1LjgxMjNDNDUuMDgwNCA1My40NzA5IDQ0LjQzNyA1My45NTU2IDQ0LjIzNTEgNTQuNjU5TDQzLjQ0NzYgNTcuNDA0N0M0Mi41Mzk5IDYwLjU3MTcgMzkuMjI1IDYzLjE0NzUgMzYuMDU4NCA2My4xNDc1TDIyLjk0MjggNjMuMTcwN0wxMy4zMzk1IDYzLjE3MTVDMTEuODMzNCA2My4xNzE1IDEwLjYxODQgNjIuNjE2MyA5LjgyNjQzIDYxLjU2NTJDOS4wMTI0MyA2MC40ODQ0IDguNzk5NyA1OC45NzY2IDkuMjQzNjIgNTcuNDI5NUwxMS4wMjY2IDUxLjIxMTZDMTEuMTY4OCA1MC43MTU3IDExLjA2OTggNTAuMTgyOSAxMC43NTk4IDQ5Ljc3MTFDMTAuNDQ5OCA0OS4zNjAxIDkuOTY0NjcgNDkuMTE4MSA5LjQ0OTQ2IDQ5LjExODFINC4zMjMxOUMyLjgxNzAyIDQ5LjExODEgMS42MDIwMSA0OC41NjI5IDAuODEwMDc2IDQ3LjUxMThDLTAuMDAzOTI0IDQ2LjQzMSAtMC4yMTY2NTQgNDQuOTIzMiAwLjIyNzI2NSA0My4zNzYyTDUuMDAwNjggMjYuNzg3OUM1LjAwOTQ2IDI2Ljc2MzEgNS4wMjkxNSAyNi43MDA2IDUuMDM2NjkgMjYuNjc1OEw2LjU3NzczIDIxLjMzMjhDNi41OTE3NiAyMS4yOTQzIDYuNjAzNzQgMjEuMjU2NiA2LjYxNDk4IDIxLjIxNzRMNy4wMjkyIDE5Ljc3MTNDNy45MzY4OSAxNi42MDUxIDExLjI1MTQgMTQuMDI4NSAxNC40MTggMTQuMDI4NUgyMC41NTE0QzIxLjI4MzIgMTQuMDI4NSAyMS45MjcgMTMuNTQzOCAyMi4xMjg1IDEyLjg0MDRMMjQuMTU2NyA1Ljc2NzY2QzI1LjA2NDUgMi42MDA1OCAyOC4zNzkzIDAuMDI0ODU4MSAzMS41NDYzIDAuMDI0ODU4MUw0NC42OTE1IDBINTQuMjY0N0M1NS43NzA5IDAgNTYuOTg1OSAwLjU1NTI0NiA1Ny43Nzc4IDEuNjA2MzRDNTguNTkyMiAyLjY4NzE0IDU4LjgwNDUgNC4xOTQ5NSA1OC4zNjA2IDUuNzQyOEw1NS42MTUgMTUuMzE5MkM1NC43MDY5IDE4LjQ4NTUgNTEuMzkyIDIxLjA2MTIgNDguMjI1NCAyMS4wNjEyTDM1LjA4MDIgMjEuMDg1M0gyOC45NDkzQzI4LjIxNzggMjEuMDg1MyAyNy41NzQ1IDIxLjU2OTkgMjcuMzcyMiAyMi4yNzI2TDI0LjY2NzggMzEuNjg0QzI0LjY1NzggMzEuNzEzNiAyNC42NDI1IDMxLjc2MDkgMjQuNjM0MiAzMS43OTA2TDIyLjI2MTUgNDAuMDA3NEMyMi4xMTgxIDQwLjUwMzMgMjIuMjE2NiA0MS4wMzc3IDIyLjUyNzQgNDEuNDUwM0MyMi44Mzc1IDQxLjg2MTMgMjMuMzIyNiA0Mi4xMDMyIDIzLjgzNzggNDIuMTAzMkMyMy44MzkgNDIuMTAzMiAzMi41MjQxIDQyLjA4NjQgMzIuNTI0MSA0Mi4wODY0SDQyLjA5NzNDNDMuNjAzNCA0Mi4wODY0IDQ0LjgxODQgNDIuNjQxNyA0NS42MTA0IDQzLjY5MjhDNDYuNDI0OCA0NC43NzM2IDQ2LjYzNzEgNDYuMjgxNCA0Ni4xOTMyIDQ3LjgyOTJMNDUuNjQ2NCA0OS43Mzc2QzQ1LjUwNDIgNTAuMjMyNyA0NS42MDMyIDUwLjc2NTUgNDUuOTEzMiA1MS4xNzczQzQ2LjIyMzIgNTEuNTg4NCA0Ni43MDgzIDUxLjgzMDMgNDcuMjIzNSA1MS44MzAzSDQ4Ljk2NDFDNDkuNjk1NiA1MS44MzAzIDUwLjMzODkgNTEuMzQ1NiA1MC41NDEyIDUwLjY0MjlMNTEuNTczNSA0Ny4wNTEzQzUxLjU4MzUgNDcuMDIxNyA1NS40MDMyIDMzLjgwMzIgNTUuNDAzMiAzMy44MDMyQzU2LjMxMTcgMzAuNjMzNyA1OS42MjY1IDI4LjA1OCA2Mi43OTM2IDI4LjA1OEg2OC45MDU3QzY5LjYzNzYgMjguMDU4IDcwLjI4MTMgMjcuNTczMyA3MC40ODI4IDI2Ljg2OTFMNzIuNTEyNiAxOS43ODkxQzczLjQyMTEgMTYuNjIyOSA3Ni43MzYzIDE0LjA0NjMgNzkuOTAyNiAxNC4wNDYzSDg5LjQ3NzRDOTAuOTgzNiAxNC4wNDYzIDkyLjE5ODYgMTQuNjAxNiA5Mi45OTA1IDE1LjY1MjZDOTMuODA0OSAxNi43MzM0IDk0LjAxNzYgMTguMjQxMyA5My41NzM3IDE5Ljc4ODNMOTEuODAyNyAyNS45NjUzQzkxLjY2MDYgMjYuNDYwNCA5MS43NTk1IDI2Ljk5MzIgOTIuMDY5NSAyNy40MDVDOTIuMzc5NSAyNy44MTYxIDkyLjg2NDcgMjguMDU4IDkzLjM3OTkgMjguMDU4SDk4LjU4NDNDMTAwLjA5IDI4LjA1OCAxMDEuMzA1IDI4LjYxMzIgMTAyLjA5NyAyOS42NjQzQzEwMi45MTIgMzAuNzQ1MSAxMDMuMTI0IDMyLjI1MjkgMTAyLjY4IDMzLjgwMDhMOTguMDk0NCA0OS43MzYxQzk3Ljk1MTggNTAuMjMxMiA5OC4wNTAzIDUwLjc2NDggOTguMzYwMyA1MS4xNzY2Qzk4LjY3IDUxLjU4ODQgOTkuMTU1NSA1MS44MzA0IDk5LjY3MTEgNTEuODMwNEgxMDEuMzk1QzEwMi4xMjYgNTEuODMwNCAxMDIuNzY5IDUxLjM0NjUgMTAyLjk3MiA1MC42NDM4TDEwNS4xMzEgNDMuMTU0NUMxMDUuMTM4IDQzLjEzMjEgMTA1LjE1OCA0My4wNzIgMTA1LjE2NCA0My4wNDk2TDExMC43NjMgMjMuNjcyNUMxMTAuNzc0IDIzLjY0MiAxMTAuNzg5IDIzLjU5MzEgMTEwLjc5OCAyMy41NjI3TDExMS44OSAxOS43NzM5QzExMi43OTkgMTYuNjA1MyAxMTYuMTE0IDE0LjAyODggMTE5LjI4IDE0LjAyODhIMTQxLjk1N0MxNDMuNDYzIDE0LjAyODggMTQ0LjY3OCAxNC41ODQ3IDE0NS40NyAxNS42MzU5QzE0Ni4yODUgMTYuNzE1OSAxNDYuNDk4IDE4LjIyMzcgMTQ2LjA1NCAxOS43NzA3TDE0NC4yNzggMjUuOTY0NkMxNDQuMTM1IDI2LjQ2MDUgMTQ0LjIzNCAyNi45OTMzIDE0NC41NDQgMjcuNDA0M0MxNDQuODU0IDI3LjgxNjEgMTQ1LjMzOSAyOC4wNTgxIDE0NS44NTUgMjguMDU4MUgxNDcuNjQzQzE0OC4zNzUgMjguMDU4MSAxNDkuMDE5IDI3LjU3MzQgMTQ5LjIyIDI2Ljg3TDE1MS4yNTEgMTkuNzg5MkMxNTIuMTU5IDE2LjYyMjkgMTU1LjQ3NCAxNC4wNDY0IDE1OC42NCAxNC4wNDY0SDE2OC4yMTVDMTY5LjcyMiAxNC4wNDY0IDE3MC45MzcgMTQuNjAxNiAxNzEuNzI5IDE1LjY1MjdDMTcyLjU0MyAxNi43MzM1IDE3Mi43NTUgMTguMjQxMyAxNzIuMzExIDE5Ljc4OTJMMTcwLjU0MSAyNS45NjU0QzE3MC4zOTkgMjYuNDYwNSAxNzAuNDk4IDI2Ljk5MzMgMTcwLjgwOCAyNy40MDUxQzE3MS4xMTggMjcuODE2MSAxNzEuNjAzIDI4LjA1ODEgMTcyLjExOCAyOC4wNTgxSDE3Ny4yMzFDMTc4LjczNyAyOC4wNTgxIDE3OS45NTIgMjguNjEzMyAxODAuNzQ0IDI5LjY2NDRDMTgxLjU1OCAzMC43NDUyIDE4MS43NyAzMi4yNTMgMTgxLjMyNiAzMy44MDAxTDE4MC43ODIgMzUuNzAxMkMxODAuNjM5IDM2LjE5NjQgMTgwLjczOCAzNi43MjkxIDE4MS4wNDggMzcuMTQxQzE4MS4zNTggMzcuNTUyIDE4MS44NDQgMzcuNzkzOSAxODIuMzU5IDM3Ljc5MzlIMTg0LjA5M0MxODQuODI0IDM3Ljc5MzkgMTg1LjQ2NyAzNy4zMTA4IDE4NS42NyAzNi42MDlMMTkwLjUzNiAxOS43NzQ4QzE5MS40NDUgMTYuNjA0NiAxOTQuNzYgMTQuMDI4OCAxOTcuOTI2IDE0LjAyODhIMjA0LjA4MkMyMDQuODE0IDE0LjAyODggMjA1LjQ1NyAxMy41NDQxIDIwNS42NTkgMTIuODQwN0wyMDcuNjk1IDUuNzQzMTNDMjA4LjYwMyAyLjU3NjA1IDIxMS45MTggMC4wMDAzMjgxNiAyMTUuMDg0IDAuMDAwMzI4MTZIMjI0LjY1OUMyMjYuMTY2IDAuMDAwMzI4MTYgMjI3LjM4MSAwLjU1NTU3NSAyMjguMTczIDEuNjA2NjdDMjI4Ljk4NyAyLjY4NzQ2IDIyOS4yIDQuMTk1MjggMjI4Ljc1NSA1Ljc0MzEzTDIyNi4wMSAxNS4zMTk2QzIyNS4xMDIgMTguNDg1OCAyMjEuNzg3IDIxLjA2MTUgMjE4LjYyMSAyMS4wNjE1SDIxMi40NjRDMjExLjczMyAyMS4wNjE1IDIxMS4wODkgMjEuNTQ2MiAyMTAuODg3IDIyLjI1MDVMMjA5LjgyMiAyNS45NjU1QzIwOS42OCAyNi40NjA2IDIwOS43NzkgMjYuOTkzNCAyMTAuMDg5IDI3LjQwNTJDMjEwLjM5OSAyNy44MTYyIDIxMC44ODQgMjguMDU4MiAyMTEuMzk5IDI4LjA1ODJIMjE2LjU0OEMyMTguMDU0IDI4LjA1ODIgMjE5LjI2OSAyOC42MTM0IDIyMC4wNjEgMjkuNjY0NUMyMjAuODc2IDMwLjc0NDUgMjIxLjA4OCAzMi4yNTIzIDIyMC42NDQgMzMuODAwMUwyMjAuMDk5IDM1LjcwMTNDMjE5Ljk1NyAzNi4xOTY0IDIyMC4wNTYgMzYuNzI5MiAyMjAuMzY2IDM3LjE0MUMyMjAuNjc2IDM3LjU1MjEgMjIxLjE2MSAzNy43OTQgMjIxLjY3NiAzNy43OTRIMjIzLjQxN0MyMjQuMTQ4IDM3Ljc5NCAyMjQuNzkxIDM3LjMxMDkgMjI0Ljk5NCAzNi42MDgzTDIyOS44NTMgMTkuNzc0OEMyMzAuNzYzIDE2LjYwNTQgMjM0LjA3OCAxNC4wMjg4IDIzNy4yNDQgMTQuMDI4OEgyNDYuODE5QzI0OC4zMjYgMTQuMDI4OCAyNDkuNTQxIDE0LjU4NDEgMjUwLjMzMyAxNS42MzUyQzI1MS4xNDcgMTYuNzE2IDI1MS4zNTkgMTguMjIzOCAyNTAuOTE1IDE5Ljc3MTZMMjQ2LjU5MyAzNC44MDE2QzI0Ni41ODIgMzQuODMxMiAyNDYuNTY3IDM0Ljg3ODYgMjQ2LjU1OCAzNC45MDlMMjQ2LjA5NSAzNi41MTdDMjQ1Ljk1MyAzNy4wMTI5IDI0Ni4wNTEgMzcuNTQ2NSAyNDYuMzYxIDM3Ljk1ODJDMjQ2LjY3MSAzOC4zNyAyNDcuMTU2IDM4LjYxMiAyNDcuNjcyIDM4LjYxMkgyNDkuMzg1QzI1MC4xMTYgMzguNjEyIDI1MC43NTkgMzguMTI4MiAyNTAuOTYxIDM3LjQyNjNMMjU2LjA1NCAxOS43NzQ5QzI1Ni45NjMgMTYuNjA1NSAyNjAuMjc3IDE0LjAyODkgMjYzLjQ0NCAxNC4wMjg5SDI3My4wMTlDMjc0LjUyNSAxNC4wMjg5IDI3NS43NCAxNC41ODQ5IDI3Ni41MzIgMTUuNjM2MUMyNzcuMzQ3IDE2LjcxNjEgMjc3LjU1OSAxOC4yMjM5IDI3Ny4xMTUgMTkuNzcxN0wyNjYuMjc0IDU3LjQwMzVDMjY1LjM2NSA2MC41NzIyIDI2Mi4wNSA2My4xNDggMjU4Ljg4NCA2My4xNDhIMjUyLjcyOEMyNTEuOTk2IDYzLjE0OCAyNTEuMzUyIDYzLjYzMjcgMjUxLjE1MSA2NC4zMzYxTDI0OS4xMTUgNzEuNDMzN0MyNDguMjA4IDc0LjYwMDcgMjQ0Ljg5MyA3Ny4xNzY1IDI0MS43MjYgNzcuMTc2NUwyMzIuMTUxIDc3LjE3NjFaTTc3LjMyNjQgMzUuMTA3NEM3Ni41OTU0IDM1LjEwNzQgNzUuOTUyNCAzNS41OTEyIDc1Ljc0OTcgMzYuMjkzOUw3MC42NDEgNTQuMDIwNkM3MC40OTg0IDU0LjUxNTcgNzAuNTk2NSA1NS4wNDkzIDcwLjkwNjYgNTUuNDYxMUM3MS4yMTY2IDU1Ljg3MzcgNzEuNzAyMSA1Ni4xMTU3IDcyLjIxNzcgNTYuMTE1N0g3My45NTFDNzQuNjgyMSA1Ni4xMTU3IDc1LjMyNSA1NS42MzE5IDc1LjUyNzcgNTQuOTI5Mkw4MC42MzY0IDM3LjIwMjVDODAuNzc5IDM2LjcwNzQgODAuNjgwOSAzNi4xNzM4IDgwLjM3MDkgMzUuNzYyQzgwLjA2MDggMzUuMzQ5NCA3OS41NzUzIDM1LjEwNzQgNzkuMDU5OCAzNS4xMDc0SDc3LjMyNjRaIiBmaWxsPSIjRjBGRjQxIiBzdHlsZT0iZmlsbDojRjBGRjQxO2ZpbGw6Y29sb3IoZGlzcGxheS1wMyAwLjk0MTIgMS4wMDAwIDAuMjU0OSk7ZmlsbC1vcGFjaXR5OjE7Ii8+Cjwvc3ZnPgo=';

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/png';
    const raw = Buffer.from(await res.arrayBuffer());
    // satori only supports PNG/JPEG — convert other formats (e.g. WebP)
    const needsConversion =
      !contentType.includes('png') && !contentType.includes('jpeg') && !contentType.includes('jpg');
    const pngBuffer = needsConversion ? await sharp(raw).png().toBuffer() : raw;
    const mime = needsConversion ? 'image/png' : contentType;
    return `data:${mime};base64,${pngBuffer.toString('base64')}`;
  } catch {
    return null;
  }
}

function workflowLayout(title: string, thumbnailDataUri: string | null, creatorName?: string) {
  const logo = LOGO_DATA_URI;
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        padding: '60px',
        fontFamily: 'Inter',
      },
      children: [
        // Thumbnail
        thumbnailDataUri
          ? {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexShrink: 0,
                  marginRight: '48px',
                  alignItems: 'center',
                },
                children: [
                  {
                    type: 'img',
                    props: {
                      src: thumbnailDataUri,
                      width: 440,
                      height: 330,
                      style: {
                        borderRadius: '16px',
                        objectFit: 'cover',
                      },
                    },
                  },
                ],
              },
            }
          : null,
        // Text content
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              overflow: 'hidden',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 40,
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  },
                  children: title,
                },
              },
              creatorName
                ? {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: 24,
                        color: '#888888',
                        marginTop: '16px',
                      },
                      children: `by @${creatorName}`,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
        // Logo bottom-right
        {
          type: 'img',
          props: {
            src: logo,
            width: 125,
            height: 35,
            style: {
              position: 'absolute',
              bottom: '40px',
              right: '48px',
            },
          },
        },
      ].filter(Boolean),
    },
  };
}

function creatorLayout(displayName: string, username: string, avatarDataUri: string | null) {
  const logo = LOGO_DATA_URI;
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter',
      },
      children: [
        // Avatar
        avatarDataUri
          ? {
              type: 'img',
              props: {
                src: avatarDataUri,
                width: 120,
                height: 120,
                style: {
                  borderRadius: '60px',
                  objectFit: 'cover',
                },
              },
            }
          : {
              type: 'div',
              props: {
                style: {
                  width: 120,
                  height: 120,
                  borderRadius: '60px',
                  background: 'linear-gradient(135deg, #c8ff00, #a0cc00)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  fontWeight: 700,
                  color: '#000000',
                },
                children: displayName.charAt(0).toUpperCase(),
              },
            },
        // Display name
        {
          type: 'div',
          props: {
            style: {
              fontSize: 48,
              fontWeight: 700,
              color: '#ffffff',
              marginTop: '24px',
            },
            children: displayName,
          },
        },
        // Username
        {
          type: 'div',
          props: {
            style: {
              fontSize: 28,
              color: '#888888',
              marginTop: '8px',
            },
            children: `@${username}`,
          },
        },
        // Logo bottom-right
        {
          type: 'img',
          props: {
            src: logo,
            width: 125,
            height: 35,
            style: {
              position: 'absolute',
              bottom: '40px',
              right: '48px',
            },
          },
        },
      ],
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderOgPng(layout: any): Promise<Uint8Array> {
  const fonts = await loadFonts();
  const svg = await satori(layout, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
  });
  return resvg.render().asPng();
}

export { workflowLayout, creatorLayout, fetchImageAsDataUri };
