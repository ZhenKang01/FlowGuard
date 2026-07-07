import os
import ssl
import aiohttp

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

original_init = aiohttp.TCPConnector.__init__
def new_init(self, *args, **kwargs):
    kwargs['ssl'] = ssl_context
    original_init(self, *args, **kwargs)
aiohttp.TCPConnector.__init__ = new_init

import asyncio
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable not set in .env")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

BACKEND_URL = "http://127.0.0.1:8000"

# FSM States
class PredictState(StatesGroup):
    waiting_for_hour = State()
    waiting_for_flow_rate = State()

async def safe_request(session, method, url, **kwargs):
    try:
        async with session.request(method, url, timeout=15, **kwargs) as response:
            if response.status == 500:
                return None, "System Error: FlowGuard central server is currently unreachable. Please manually verify sector valves."
            response.raise_for_status()
            return await response.json(), None
    except (aiohttp.ClientError, asyncio.TimeoutError):
        return None, "System Error: FlowGuard central server is currently unreachable. Please manually verify sector valves."

@dp.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer(
        "Welcome to FlowGuard Bot! 🌊\n"
        "Commands:\n"
        "/predict - Predict leak probability\n"
        "Or simply send a message (RAG mode) or upload an image."
    )

@dp.message(Command("predict"))
async def cmd_predict(message: Message, state: FSMContext):
    await message.answer("Please enter the hour (0-23):")
    await state.set_state(PredictState.waiting_for_hour)

@dp.message(PredictState.waiting_for_hour, F.text)
async def process_hour(message: Message, state: FSMContext):
    try:
        hour = int(message.text.strip())
        await state.update_data(hour=hour)
        await message.answer("Please enter the flow rate (float):")
        await state.set_state(PredictState.waiting_for_flow_rate)
    except ValueError:
        await message.answer("Invalid input. Please enter a valid integer for the hour:")

@dp.message(PredictState.waiting_for_flow_rate, F.text)
async def process_flow_rate(message: Message, state: FSMContext):
    try:
        flow_rate = float(message.text.strip())
        data = await state.get_data()
        hour = data['hour']
        await state.clear()
        
        async with aiohttp.ClientSession() as session:
            payload = {"hour": hour, "flow_rate": flow_rate}
            resp_data, err = await safe_request(session, "POST", f"{BACKEND_URL}/predict", json=payload)
            
            if err:
                await message.answer(err)
                return
                
            prob = resp_data.get("leak_probability", 0)
            if prob > 0.5:
                await message.answer(f"CRITICAL ALERT: Leak probability is {prob*100:.2f}%. Acknowledge & Dispatch required.")
            else:
                await message.answer(f"Normal. Leak probability is {prob*100:.2f}%.")
                
    except ValueError:
        await message.answer("Invalid input. Please enter a valid float for the flow rate:")

@dp.message(F.photo)
async def handle_photo(message: Message):
    photo = message.photo[-1]
    
    file = await bot.get_file(photo.file_id)
    file_content = await bot.download_file(file.file_path)
    photo_bytes = file_content.read()
    
    data = aiohttp.FormData()
    data.add_field('file', photo_bytes, filename='photo.jpg', content_type='image/jpeg')
    
    async with aiohttp.ClientSession() as session:
        resp_data, err = await safe_request(session, "POST", f"{BACKEND_URL}/detect-visual-leak", data=data)
        
        if err:
            await message.answer(err)
            return
            
        await message.answer(f"Visual Analysis Data: {resp_data}")

@dp.message(F.text)
async def handle_text(message: Message):
    async with aiohttp.ClientSession() as session:
        payload = {"message": message.text}
        resp_data, err = await safe_request(session, "POST", f"{BACKEND_URL}/chat", json=payload)
        
        if err:
            await message.answer(err)
            return
            
        reply = resp_data.get("reply", "No response from server.")
        await message.answer(reply)

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
