# TYPHON — komunikator desktopowy

TYPHON to lekki komunikator w jednym pliku: czat 1:1 i grupowy, połączenia głosowe, reakcje emoji, cytowanie wiadomości, powiadomienia systemowe i tryb offline dla awatarów. Aplikacja działa w przeglądarce i jako program na Windows/Linux.

## Funkcje

- **Czat:** wiadomości 1:1 i grupowe, odpowiedzi (cytowanie), reakcje emoji, edycja i usuwanie.
- **Połączenia głosowe:** szyfrowane WebRTC (DTLS) przez serwer TURN, test mikrofonu, wybór urządzenia.
- **Serwery i kanały:** tworzenie serwerów, zapraszanie kodem, kanały tekstowe.
- **Powiadomienia:** systemowe (Windows/Linux) i dźwiękowe, ustawienia per typ.
- **Prywatność:** polityka wiadomości prywatnych, blokowanie użytkowników, tryb „away”.
- **Wygląd:** motywy (jasny/ciemny), akcenty kolorów, skala interfejsu, tryb wysokiego kontrastu i czytelny tekst.
- **Offline:** cache awatarów i wiadomości, działanie bez sieci.
- **Konta:** logowanie i rejestracja przez Firebase Authentication (e-mail i hasło, reset hasła), synchronizacja przez Firebase Realtime Database.
- **Autorskie kodowanie:** „Typhon Decode” — warstwa obfuskacji treści wiadomości (nie jest szyfrowaniem kryptograficznym).
- **Aktualizacje:** automatyczne sprawdzanie nowych wersji przy starcie, ekran pobierania z postępem, prędkością i pozostałym rozmiarem.

## Pobieranie

Gotowe instalatory (Windows: `.exe`/`.msi`, Linux: `.AppImage`/`.deb`) oraz paczki `Windows.zip`/`Linux.zip` z README znajdują się w [Releases](https://github.com/weff222/typhon-app/releases).

## Uwagi

- Typhon Decode nie jest szyfrowaniem end-to-end. Nie traktuj go jako zabezpieczenia poufnych danych.
- Połączenia głosowe wymagają dostępu do mikrofonu — zezwól na nie w systemie przy pierwszym użyciu.
