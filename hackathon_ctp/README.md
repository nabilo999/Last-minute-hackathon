# AI integration
The LLM used is Gemini Flash. The AI integrated itself using a key and was prompted to make a short murder mystery web game. The JSON fields are the setting, the victim, a secret Murderer ID, the solution logic, the solution explanation, and a list of suspects. The LLM is tasked with giving each suspect a secret, but only the murderer as a contradiction in their timeline.
# End Screen
On the end screen the player will find out if they won or if the killer got away. The solution explanation from the LLM will be displayed, along with the killer's name. On this screen the player can also choose to start a new game.
# Game 
The player will be allowed to ask a total of five questions to ask four suspects. Each question is prompted to the LLM itself playing a character. The setting and suspects are subject to change per playthrough. Each suspect can be eliminated until either there's one suspect left or until the killer is caught.
# Story Intro
The setting, description, victim, and murder details are all pulled from the LLM and are subject to change per playthrough.
# Suspect Card
The player can either ask the suspect a question or accuse the suspect. When asking a suspect a question the question modal is opened, allowing the player to prompt the LLM. When the suspect is accused and they are not the killer, the suspect will be "cleared" and the game continues, unless the last suspect left is the killer. If the killer is accused the player will be taken to the end screen.
